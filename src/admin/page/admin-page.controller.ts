import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { StaffGuard } from "@auth/guards/staff.guard";
import { CurrentUser } from "@auth/decorators/current-user.decorator";
import { UserEntity } from "@shared/entities";
import { PageService } from "../../page/page.service";
import { UpsertPageDto } from "../../page/dto/upsert-page.dto";

/** Admin CRUD for content pages. Drafts included — unlike the public API. */
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller("admin/pages")
export class AdminPageController {
  constructor(private readonly pages: PageService) {}

  @Get()
  list() {
    return this.pages.listAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.pages.findById(id);
  }

  @Post()
  create(@Body() dto: UpsertPageDto, @CurrentUser() user: UserEntity) {
    return this.pages.create(dto, user);
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpsertPageDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.pages.update(id, dto, user);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.pages.remove(id);
  }
}
