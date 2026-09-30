import { DataSource } from "typeorm";
import { config } from "./config";
import { entities } from "@shared/entities";

/**
 * The data source the TypeORM CLI uses — migrations only, never the running
 * app, which builds its own connection in `modules/mariaDB.module.ts`.
 *
 * It reads the same config and the same entity array, so the schema the CLI
 * sees and the schema the app expects cannot drift.
 */
export default new DataSource({
  type: (process.env.DB_TYPE ?? "mariadb") as "mariadb" | "mysql",
  host: config.get("db.host"),
  port: config.get("db.port"),
  username: config.get("db.username"),
  password: config.get("db.password"),
  database: config.get("db.database"),
  charset: "utf8mb4",
  entities: [...entities],
  migrations: [__dirname + "/../utils/migrations/*.{ts,js}"],
});
