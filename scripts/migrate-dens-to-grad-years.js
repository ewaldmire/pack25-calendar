#!/usr/bin/env node
// One-off migration: rewrite existing events' `dens` values from rank
// names ("lions", "tigers", ...) to graduation-year strings ("2037", ...),
// matching the rekey in src/lib/dens.js. Run this once, after deploying
// the new code, against a database that still has old-style rank strings
// in it. Safe to run more than once — it's a no-op the second time, since
// there are no old rank strings left to match.
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/migrate-dens-to-grad-years.js
//     Dry run only — prints the computed mapping and how many rows would
//     be affected. Makes no changes.
//
//   DATABASE_URL=postgres://... node scripts/migrate-dens-to-grad-years.js --apply
//     Actually performs the UPDATE (in a transaction) and drops the old
//     dens CHECK constraint if one still exists on the table (fresh
//     installs no longer create it — see server/db.js).
//
// Back up first: ./scripts/backup.sh (pulls the live data via the public
// API into a timestamped JSON file) before running with --apply.

import pg from "pg";
import { getActiveKidDens } from "../src/lib/dens.js";

const { Pool } = pg;
const APPLY = process.argv.includes("--apply");

const OLD_RANKS = ["lions", "tigers", "wolves", "bears", "webelos", "aols"];

async function main() {
  // getActiveKidDens() computes today's 6 active cohorts in rank order
  // (Lion..AOL) from the same formula the app uses everywhere else, so
  // this mapping is always correct for whatever day the script actually
  // runs on — no hardcoded year values to keep in sync by hand.
  const mapping = Object.fromEntries(
    getActiveKidDens().map((d, i) => [OLD_RANKS[i], d.value])
  );

  console.log("Computed mapping (today's active cohort per old rank slug):");
  for (const [oldRank, gradYear] of Object.entries(mapping)) {
    console.log(`  ${oldRank.padEnd(8)} -> ${gradYear}`);
  }
  console.log("  leaders  -> leaders (unchanged)\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: countRows } = await pool.query(
    "SELECT count(*) FROM events WHERE dens && $1::text[]",
    [OLD_RANKS]
  );
  const affected = Number(countRows[0].count);
  console.log(`${affected} row(s) currently carry an old rank-string den value.`);

  if (!APPLY) {
    console.log("\nDry run only — no changes made. Re-run with --apply to perform the migration.");
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Must run before the UPDATE below — an already-deployed table from
    // before this change still has this constraint (fresh installs no
    // longer create it, see server/db.js), and it enumerates the old rank
    // strings, so it would reject the new grad-year values on write.
    const { rows: constraints } = await client.query(
      `SELECT conname FROM pg_constraint
       WHERE conrelid = 'events'::regclass AND contype = 'c' AND conname LIKE '%dens%'`
    );
    for (const { conname } of constraints) {
      console.log(`Dropping stale constraint: ${conname}`);
      await client.query(`ALTER TABLE events DROP CONSTRAINT ${client.escapeIdentifier(conname)}`);
    }

    const { rows: updated } = await client.query(
      `UPDATE events SET dens = array_replace(array_replace(array_replace(array_replace(array_replace(array_replace(
         dens, 'lions', $1), 'tigers', $2), 'wolves', $3), 'bears', $4), 'webelos', $5), 'aols', $6)
       WHERE dens && $7::text[]
       RETURNING id`,
      [mapping.lions, mapping.tigers, mapping.wolves, mapping.bears, mapping.webelos, mapping.aols, OLD_RANKS]
    );
    console.log(`Updated ${updated.length} row(s).`);

    await client.query("COMMIT");
    console.log("Done.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
