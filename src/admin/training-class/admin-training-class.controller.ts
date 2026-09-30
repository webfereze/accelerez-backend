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
import { StaffGuard } from "@auth/guards/staff.guard";
import { TrainingClassService } from "../../training-class/training-class.service";
import {
  TrainingClassQueryDto,
  UpsertTrainingClassDto,
} from "../../training-class/dto/training-class.dto";

/**
 * Admin CRUD for classes — drafts included, unlike the public API.
 *
 * `StaffGuard` rather than `@Roles(ADMIN)`, unlike trainers: a class is
 * marketing copy with a price on it, not an account that can sign in, so an
 * editor may manage it.
 */
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller("admin/classes")
export class AdminTrainingClassController {
  constructor(private readonly classes: TrainingClassService) {}

  @Get()
  list(@Query() query: TrainingClassQueryDto) {
    return this.classes.list(query);
  }

  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.classes.findById(id);
  }

  @Post()
  create(@Body() dto: UpsertTrainingClassDto) {
    return this.classes.create(dto);
  }

  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpsertTrainingClassDto) {
    return this.classes.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.classes.remove(id);
  }
}
