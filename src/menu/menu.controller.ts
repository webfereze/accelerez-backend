import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { StaffGuard } from "@auth/guards/staff.guard";
import { MenuKey } from "@shared/enums/menu.enum";
import { MenuService } from "./menu.service";
import {
  CreateMenuItemDto,
  ReorderMenuDto,
  UpdateMenuItemDto,
} from "./dto/menu-item.dto";

/** Public: the resolved, visible menu tree the site renders. */
@Controller("menu")
export class PublicMenuController {
  constructor(private readonly service: MenuService) {}

  @Get(":menu")
  tree(@Param("menu", new ParseEnumPipe(MenuKey)) menu: MenuKey) {
    return this.service.findPublicTree(menu);
  }
}

/** Admin: the full builder, hidden entries included. */
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller("admin/menu")
export class AdminMenuController {
  constructor(private readonly service: MenuService) {}

  @Get(":menu")
  findAll(@Param("menu", new ParseEnumPipe(MenuKey)) menu: MenuKey) {
    return this.service.findAll(menu);
  }

  @Post()
  create(@Body() dto: CreateMenuItemDto) {
    return this.service.create(dto);
  }

  /**
   * Saves a whole rearrangement at once. Declared before `:id` — Nest matches
   * routes in order, and `PATCH /admin/menu/reorder` would otherwise be read as
   * an update to the item with id "reorder".
   */
  @Patch("reorder")
  reorder(@Body() dto: ReorderMenuDto) {
    return this.service.reorder(dto);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateMenuItemDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
