import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MariaDBModule } from "@shared/modules/mariaDB.module";
import { entities } from "@shared/entities";
import { RevalidationService } from "@shared/services/revalidation.service";

/**
 * Imports the database connection and re-exports a repository for every entity
 * via `TypeOrmModule.forFeature`. A feature module imports this and can inject
 * any repository.
 *
 * NOTE: `forFeature` is imported directly, without `forwardRef` — Nest refuses
 * to re-export a module it cannot resolve statically in `imports`.
 */
@Module({
  imports: [MariaDBModule, TypeOrmModule.forFeature(entities)],
  providers: [RevalidationService],
  exports: [TypeOrmModule, RevalidationService],
})
export class SharedModule {}
