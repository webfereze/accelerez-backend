import { Module } from "@nestjs/common";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { config } from "@shared/config/config";
import { entities } from "@shared/entities";

/**
 * Runtime database connection. Entities come from `@shared/entities` (single
 * source of truth).
 *
 * - `DB_TYPE` selects the driver: "mariadb" (local, default) or "mysql"
 *   (Railway). Both use the same `mysql2` driver, so switching is config only.
 * - `synchronize` tracks the schema off the entities (no migrations). It is on
 *   in non-production, and can be forced with `DB_SYNCHRONIZE=true`.
 */
const dbType = (process.env.DB_TYPE ?? "mariadb") as "mariadb" | "mysql";
const synchronize =
  config.get("env") !== "production" || process.env.DB_SYNCHRONIZE === "true";
const runMigrations =
  config.get("env") === "production" || process.env.DB_SYNCHRONIZE === "true";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: dbType,
      host: config.get("db.host"),
      port: config.get("db.port"),
      username: config.get("db.username"),
      password: config.get("db.password"),
      database: config.get("db.database"),
      charset: "utf8mb4",
      entities,
      synchronize,
      migrations: [__dirname + "/../utils/migrations/*.js"],
      migrationsRun: runMigrations,
    } as TypeOrmModuleOptions),
  ],
})
export class MariaDBModule {}
