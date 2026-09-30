import dataSource from "@shared/config/typeOrm.config";
import { SEEDERS } from "../seed/registry";
import { ensureHistoryTable, runSeeders } from "../seed/runner";
import { SeedRunEntity } from "@shared/entities";

/**
 * Runs every seeder that has not run before.
 *
 *   yarn seed                 # everything pending
 *   yarn seed --only=tours    # just the ones whose name contains "tours"
 *   yarn seed --status        # what has run, without running anything
 *
 * Safe to run repeatedly: `seed_history` records what has been applied, so a
 * second run does nothing. That is what makes it safe to run on every deploy.
 */
async function main() {
  const args = process.argv.slice(2);
  const only = args
    .filter((arg) => arg.startsWith("--only="))
    .flatMap((arg) => arg.slice("--only=".length).split(","))
    .filter(Boolean);

  await dataSource.initialize();

  try {
    if (args.includes("--status")) {
      // `--status` must work on a database the app has never booted against,
      // which is exactly when the table is missing.
      await ensureHistoryTable(dataSource);
      const rows = await dataSource.getRepository(SeedRunEntity).find();
      const done = new Set(rows.map((row) => row.name));
      console.log("Seed status:");
      for (const seeder of SEEDERS) {
        console.log(`  ${done.has(seeder.name) ? "applied" : "pending"}  ${seeder.name}`);
      }
      return;
    }

    console.log("Seeding:");
    const { applied, skipped, batch } = await runSeeders(dataSource, SEEDERS, { only });

    console.log(
      applied.length
        ? `\nApplied ${applied.length} seeder(s) as batch ${batch}; ${skipped.length} already done.`
        : `\nNothing to do — all ${skipped.length} seeder(s) already applied.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
