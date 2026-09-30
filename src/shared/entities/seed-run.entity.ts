import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * One row per seeder that has been run — the same idea as Laravel's
 * `migrations` table.
 *
 * Seeders are idempotent by slug on their own, but that is not enough: a
 * re-run would still walk every record to decide it has nothing to do, and
 * "already applied" is a fact worth recording rather than re-deriving. With
 * this table a deploy can safely run the seeder on every boot and it does
 * nothing after the first.
 *
 * `batch` groups everything applied in one run, so a later "what did that
 * deploy add?" has an answer.
 */
@Entity({ name: "seed_history" })
export class SeedRunEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /**
   * The seeder's stable identifier, e.g. `2026_08_28_tours`. Unique — the
   * database, not the runner, is what guarantees a seeder cannot run twice
   * when two instances boot at the same moment.
   */
  @Index({ unique: true })
  @Column({ length: 120 })
  name: string;

  @Column({ type: "int" })
  batch: number;

  @CreateDateColumn()
  ranAt: Date;
}
