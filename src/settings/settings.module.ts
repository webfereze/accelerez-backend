import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { AuthModule } from "@auth/auth.module";
import { SettingsService } from "./settings.service";
import {
  AdminSettingsController,
  PublicSettingsController,
} from "./settings.controller";

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [PublicSettingsController, AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
