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
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { RolesGuard } from "@auth/guards/roles.guard";
import { Roles } from "@auth/decorators/roles.decorator";
import { UserRole } from "@shared/enums/user-role.enum";
import { TrainerService } from "../../trainer/trainer.service";
import { TrainerQueryDto, UpsertTrainerDto } from "../../trainer/dto/trainer.dto";

/**
 * Admin CRUD for trainers — drafts included, unlike the public API.
 *
 * **Administrators only, not editors.** Creating a trainer creates a login, and
 * an account that can sign in is not content. `@Roles(ADMIN)` rather than
 * `StaffGuard` is the difference, and it is the admission model of the whole
 * product: coaches are let in by a person, never by a sign-up form.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/trainers")
export class AdminTrainerController {
  constructor(private readonly trainers: TrainerService) {}

  @Get()
  list(@Query() query: TrainerQueryDto) {
    return this.trainers.list(query);
  }

  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.trainers.findById(id);
  }

  @Post()
  create(@Body() dto: UpsertTrainerDto) {
    return this.trainers.create(dto);
  }

  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpsertTrainerDto) {
    return this.trainers.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.trainers.remove(id);
  }
}
