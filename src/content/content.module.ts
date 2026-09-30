import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { AuthModule } from "@auth/auth.module";
import { ContentService } from "./content.service";
import { ContentController } from "./content.controller";
import { AdminContentController } from "../admin/content/admin-content.controller";

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [ContentController, AdminContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
