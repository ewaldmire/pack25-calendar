import pg from "pg";

const { Pool, types } = pg;

// Return DATE columns as raw 'YYYY-MM-DD' strings (OID 1082) instead of pg's
// default JS Date objects, which get shifted by the server's local timezone.
types.setTypeParser(1082, (val) => val);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
}
