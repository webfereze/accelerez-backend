import { Body, Controller, Get, Param, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { StaffGuard } from "@auth/guards/staff.guard";
import { SettingsService } from "./settings.service";
import { UpdateSettingDto } from "./dto/setting.dto";

/** Public: the footer renders on every page, so anyone may read it. */
@Controller("settings")
export class PublicSettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get(":key")
  get(@Param("key") key: string) {
    return this.service.get(key);
  }
}

@UseGuards(JwtAuthGuard, StaffGuard)
@Controller("admin/settings")
export class AdminSettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get(":key")
  get(@Param("key") key: string) {
    return this.service.get(key);
  }

  @Put(":key")
  set(@Param("key") key: string, @Body() dto: UpdateSettingDto) {
    return this.service.set(key, dto.value);
  }
}
