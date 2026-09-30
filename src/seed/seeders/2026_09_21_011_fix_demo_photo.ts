import type { DataSource } from "typeorm";
import { TrainerEntity } from "@shared/entities";

/**
 * One of the demo portraits 404s.
 *
 * A separate seeder rather than an edit to 006, which has already run: a
 * seeder's name is its key in `seed_history`, so editing one changes nothing on
 * a database that already has it, and the broken image would survive every
 * redeploy.
 *
 * Only touches the row if it still carries the dead URL, so a real photograph
 * uploaded in the meantime is never overwritten.
 */
const DEAD = "https://images.unsplash.com/photo-1609899537878-88d5ba429bdf?w=800&q=80";
const REPLACEMENT = "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=800&q=80";

export async function run(dataSource: DataSource) {
  const trainers = dataSource.getRepository(TrainerEntity);

  const row = await trainers.findOne({ where: { photo: DEAD } });
  if (!row) {
    console.log("  · dead demo portrait not present — nothing to do");
    return;
  }

  await trainers.update(row.id, { photo: REPLACEMENT });
  console.log(`  · replaced the demo portrait on ${row.displayName}`);
}
