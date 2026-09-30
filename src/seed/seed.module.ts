import { Logger, Module, OnApplicationBootstrap } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { SharedModule } from "@shared/shared.module";
import { SEEDERS } from "./registry";
import { runSeeders } from "./runner";

/**
 * Runs pending seeders on boot, so a deploy seeds itself.
 *
 * **`OnApplicationBootstrap`, not `OnModuleInit`.** It fires after every
 * module has initialised, which is what guarantees TypeORM has finished
 * `synchronize` — on a fresh database the tables do not exist until then, and
 * seeding earlier would fail on the first query.
 *
 * Safe to do on every boot: `seed_history` records what has been applied, so
 * this is a no-op from the second deploy onwards. Set `SEED_ON_BOOT=false` to
 * turn it off — useful if the client has started editing and you want no
 * automated writes at all, though seeders never overwrite existing records.
 */
@Module({ imports: [SharedModule] })
export class SeedModule implements OnApplicationBootstrap {
  private readonly logger = new Logger("Seed");

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED_ON_BOOT === "false") {
      this.logger.log("SEED_ON_BOOT=false — skipping.");
      return;
    }

    try {
      const { applied, skipped } = await runSeeders(this.dataSource, SEEDERS, {
        log: (message) => this.logger.log(message.trim()),
      });

      this.logger.log(
        applied.length
          ? `Applied ${applied.length} seeder(s): ${applied.join(", ")}`
          : `Nothing to seed — all ${skipped.length} already applied.`,
      );
    } catch (error) {
      /**
       * Logged, never rethrown. A failed seed must not stop the API from
       * serving: Railway restarts on failure, so throwing here turns one bad
       * seeder into a crash loop that takes the whole site down rather than
       * leaving it up with incomplete content.
       *
       * Two instances booting at once is also fine — the unique index on
       * `seed_history.name` lets exactly one of them record a given seeder, and
       * every seeder is idempotent by slug, so the loser writes nothing.
       */
      this.logger.error(
        `Seeding failed — the API is still serving. ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
