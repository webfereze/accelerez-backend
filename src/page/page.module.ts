import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { AuthModule } from "@auth/auth.module";
import { PageService } from "./page.service";
import { PageController } from "./page.controller";
import { AdminPageController } from "../admin/page/admin-page.controller";

/**
 * Both surfaces of the same data live here: `PageController` serves published
 * pages to anyone, `AdminPageController` serves full CRUD to staff. One service
 * backs both, so the publish rules cannot drift apart.
 */
@Module({
  imports: [SharedModule, AuthModule],
  controllers: [PageController, AdminPageController],
  providers: [PageService],
  exports: [PageService],
})
export class PageModule {}
