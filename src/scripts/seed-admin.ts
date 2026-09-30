import { DataSource } from "typeorm";
import { config } from "@shared/config/config";
import { entities } from "@shared/entities";
import { run } from "../seed/seeders/2026_09_21_001_admin";

/**
 * `yarn seed:admin` — create or reset the first admin account, without booting
 * the whole application. The way back in when somebody is locked out.
 */
(async () => {
  const dataSource = new DataSource({
    type: (process.env.DB_TYPE ?? "mariadb") as "mariadb" | "mysql",
    host: config.get("db.host"),
    port: config.get("db.port"),
    username: config.get("db.username"),
    password: config.get("db.password"),
    database: config.get("db.database"),
    entities: [...entities],
    synchronize: false,
  });

  await dataSource.initialize();
  await run(dataSource);
  await dataSource.destroy();
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
