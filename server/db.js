import pg from "pg";
import { DENS } from "../src/lib/dens.js";

const { Pool, types } = pg;

// Return DATE columns as raw 'YYYY-MM-DD' strings (OID 1082) instead of pg's
// default JS Date objects, which get shifted by the server's local timezone.
types.setTypeParser(1082, (val) => val);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const validDens = DENS.map((d) => d.value);
const densLiteral = `ARRAY[${validDens.map((d) => `'${d}'`).join(", ")}]::text[]`;

export async function initDb() {
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
      dens TEXT[] NOT NULL DEFAULT '{}' CHECK (dens <@ ${densLiteral}),
      sequence INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}
