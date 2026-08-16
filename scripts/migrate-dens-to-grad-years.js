#!/usr/bin/env node
// Manual entry point for the same migration server/db.js's initDb() now
// runs automatically on every boot (rewriting rank-name dens to
// graduation-year strings). Deploying the new code is enough on its own —
// this script exists for inspecting the mapping/row count ahead of time,
// or running the fixup without restarting the server.
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/migrate-dens-to-grad-years.js
//     Dry run only — prints the computed mapping and how many rows would
//     be affected. Makes no changes.
//
//   DATABASE_URL=postgres://... node scripts/migrate-dens-to-grad-years.js --apply
//     Actually performs the migration (server/db.js's migrateOldRankDens).
//
// Back up first: ./scripts/backup.sh (pulls the live data via the public
// API into a timestamped JSON file) before running with --apply.

import { pool, migrateOldRankDens } from "../server/db.js";
import { getActiveKidDens } from "../src/lib/dens.js";

const APPLY = process.argv.includes("--apply");
const OLD_RANKS = ["lions", "tigers", "wolves", "bears", "webelos", "aols"];

async function main() {
  const mapping = Object.fromEntries(
    getActiveKidDens().map((d, i) => [OLD_RANKS[i], d.value])
  );

  console.log("Computed mapping (today's active cohort per old rank slug):");
  for (const [oldRank, gradYear] of Object.entries(mapping)) {
    console.log(`  ${oldRank.padEnd(8)} -> ${gradYear}`);
  }
  console.log("  leaders  -> leaders (unchanged)\n");

  const { rows: countRows } = await pool.query(
    "SELECT count(*) FROM events WHERE dens && $1::text[]",
    [OLD_RANKS]
  );
  console.log(`${Number(countRows[0].count)} row(s) currently carry an old rank-string den value.`);

  if (!APPLY) {
    console.log("\nDry run only — no changes made. Re-run with --apply to perform the migration.");
    await pool.end();
    return;
  }

  const { affected } = await migrateOldRankDens();
  console.log(`Updated ${affected} row(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
