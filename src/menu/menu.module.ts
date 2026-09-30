import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { AuthModule } from "@auth/auth.module";
import { MenuService } from "./menu.service";
import { AdminMenuController, PublicMenuController } from "./menu.controller";

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [PublicMenuController, AdminMenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
