import { Table, type DataSource } from "typeorm";
import { SeedRunEntity } from "@shared/entities";

/**
 * One unit of seeding. `name` is a permanent identifier — it is what is written
 * to `seed_history`, so renaming a seeder makes it run again on every
 * environment that already has it.
 */
export type Seeder = {
  name: string;
  /** One line describing what it puts in the database, for the runner's log. */
  description: string;
  run: (dataSource: DataSource) => Promise<void>;
};

export type SeedResult = {
  applied: string[];
  skipped: string[];
  batch: number;
};

/**
 * Runs every seeder that has not run before, in registry order, recording each
 * in `seed_history` — the same contract as Laravel's migrations table.
 *
 * Ordering is the registry's, not alphabetical: the slider seeder needs the
 * pages to exist, and the tours need their add-ons.
 *
 * Each seeder is recorded **in its own transaction alongside its work**, so a
 * seeder that throws halfway leaves no history row and is retried next time.
 * A partially-applied seeder is why every one of them is also idempotent on
 * its own — the two mechanisms cover different failures.
 */
export async function runSeeders(
  dataSource: DataSource,
  seeders: Seeder[],
  { only, log = console.log }: { only?: string[]; log?: (message: string) => void } = {},
): Promise<SeedResult> {
  await ensureHistoryTable(dataSource);

  const history = dataSource.getRepository(SeedRunEntity);

  const previous = await history.find();
  const done = new Set(previous.map((row) => row.name));
  const batch = previous.reduce((max, row) => Math.max(max, row.batch), 0) + 1;

  const selected = only?.length
    ? seeders.filter((seeder) => only.some((name) => seeder.name.includes(name)))
    : seeders;

  if (only?.length && selected.length === 0) {
    throw new Error(
      `No seeder matches ${only.join(", ")}. Known: ${seeders.map((s) => s.name).join(", ")}`,
    );
  }

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const seeder of selected) {
    if (done.has(seeder.name)) {
      skipped.push(seeder.name);
      log(`  · ${seeder.name} — already applied`);
      continue;
    }

    log(`  → ${seeder.name} — ${seeder.description}`);
    await seeder.run(dataSource);
    await history.save(history.create({ name: seeder.name, batch }));
    applied.push(seeder.name);
  }

  return { applied, skipped, batch };
}

/**
 * Creates `seed_history` if it is missing.
 *
 * The seed CLI connects through `typeOrm.config.ts`, which has
 * `synchronize: false` — so on a database that has never had the app boot
 * against it, the table the runner depends on would not exist. Building it from
 * the entity metadata keeps the definition in one place rather than repeating
 * it as hand-written DDL.
 */
export async function ensureHistoryTable(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  try {
    const metadata = dataSource.getMetadata(SeedRunEntity);
    if (!(await queryRunner.hasTable(metadata.tablePath))) {
      await queryRunner.createTable(Table.create(metadata, dataSource.driver), true);
    }
  } finally {
    await queryRunner.release();
  }
}
