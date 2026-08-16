import pg from "pg";
import { getActiveKidDens } from "../src/lib/dens.js";

const { Pool, types } = pg;

// Return DATE columns as raw 'YYYY-MM-DD' strings (OID 1082) instead of pg's
// default JS Date objects, which get shifted by the server's local timezone.
types.setTypeParser(1082, (val) => val);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Superseded by graduation-year keys (src/lib/dens.js) — kept only as the
// source list for migrateOldRankDens below, which rewrites any leftover
// rows from before that rekey.
const OLD_RANKS = ["lions", "tigers", "wolves", "bears", "webelos", "aols"];

// One-time data fixup, run automatically on every boot (see initDb) so a
// deploy is enough on its own — no separate manual migration step. Cheap
// and safe to run every time: a plain count query when there's nothing to
// do, and the UPDATE only ever touches rows still carrying an old rank
// string, so it's naturally a no-op once they're gone. Mirrors this app's
// existing "CREATE TABLE IF NOT EXISTS" philosophy — self-heal on boot
// instead of a versioned migration runner — applied to the one known data
// transform this rekey needs.
//
// Also used by scripts/migrate-dens-to-grad-years.js directly, so there's
// one implementation instead of two copies of this SQL to keep in sync.
export async function migrateOldRankDens() {
  const { rows: countRows } = await pool.query(
    "SELECT count(*) FROM events WHERE dens && $1::text[]",
    [OLD_RANKS]
  );
  if (Number(countRows[0].count) === 0) return { affected: 0 };

  // Today's active roster in Lion..AOL order — same formula used
  // everywhere else, so this stays correct no matter which day the
  // container happens to boot on.
  const [lions, tigers, wolves, bears, webelos, aols] = getActiveKidDens().map((d) => d.value);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Must run before the UPDATE below — a table from before this rekey
    // still has this constraint (fresh installs no longer create it), and
    // it enumerates the old rank strings, so it would reject the new
    // grad-year values on write.
    const { rows: constraints } = await client.query(
      `SELECT conname FROM pg_constraint
       WHERE conrelid = 'events'::regclass AND contype = 'c' AND conname LIKE '%dens%'`
    );
    for (const { conname } of constraints) {
      await client.query(`ALTER TABLE events DROP CONSTRAINT ${client.escapeIdentifier(conname)}`);
    }

    const { rows: updated } = await client.query(
      `UPDATE events SET dens = array_replace(array_replace(array_replace(array_replace(array_replace(array_replace(
         dens, 'lions', $1), 'tigers', $2), 'wolves', $3), 'bears', $4), 'webelos', $5), 'aols', $6)
       WHERE dens && $7::text[]
       RETURNING id`,
      [lions, tigers, wolves, bears, webelos, aols, OLD_RANKS]
    );

    await client.query("COMMIT");
    return { affected: updated.length };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function initDb() {
  // No CHECK constraint on `dens` — Zod (server/events.js) is already the
  // only gate on the only two write paths, and a per-element regex CHECK
  // would need a subquery over unnest(), which Postgres disallows in CHECK
  // expressions outright. Dens are graduation-year strings (or "leaders"),
  // an open-ended set that grows every year — see src/lib/dens.js.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      date DATE NOT NULL,
      end_date DATE,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      details TEXT,
      dens TEXT[] NOT NULL DEFAULT '{}',
      sequence INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const { affected } = await migrateOldRankDens();
  if (affected > 0) {
    console.log(`Migrated ${affected} event(s) from rank-name dens to graduation-year dens.`);
  }
}
