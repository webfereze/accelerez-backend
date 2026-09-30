import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { RolesGuard } from "@auth/guards/roles.guard";
import { Roles } from "@auth/decorators/roles.decorator";
import { CurrentUser } from "@auth/decorators/current-user.decorator";
import { UserEntity } from "@shared/entities";
import { UserRole } from "@shared/enums/user-role.enum";
import { EnrollmentService } from "../../portal/enrollment.service";
import { MembershipService } from "../../portal/membership.service";
import { AccessService } from "../../portal/access.service";
import {
  PortalQueryDto,
  UpsertPeriodDto,
} from "../../portal/dto/portal.dto";

/**
 * Administrator oversight of the portal.
 *
 * A deliberately separate controller from the trainer's own, and the difference
 * is visible in every route: here the enrolment is addressed by id with **no
 * ownership filter**, because an administrator legitimately sees all of them.
 * Folding the two into one handler with a flag is how that branch becomes
 * reachable with a trainer's token.
 *
 * Administrators only, not editors — money and people, not content.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/enrollments")
export class AdminPortalController {
  constructor(
    private readonly enrollments: EnrollmentService,
    private readonly memberships: MembershipService,
    private readonly access: AccessService,
  ) {}

  @Get()
  list(@Query() query: PortalQueryDto) {
    return this.enrollments.listAll(query);
  }

  @Get(":id")
  async detail(@Param("id", ParseIntPipe) id: number) {
    const enrollment = await this.enrollments.findAny(id);

    return {
      enrollment,
      access: await this.access.stateFor(enrollment),
      periods: await this.memberships.list(enrollment.id),
    };
  }

  /**
   * An administrator marking a month for a trainer — the support path when a
   * coach cannot get to it, and the one that leaves a name in `validatedBy`.
   */
  @Post(":id/periods")
  async markPeriod(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpsertPeriodDto,
  ) {
    const enrollment = await this.enrollments.findAny(id);
    return this.memberships.upsert(enrollment, dto, user.id);
  }

  @Delete(":id/periods/:periodId")
  @HttpCode(204)
  async removePeriod(
    @Param("id", ParseIntPipe) id: number,
    @Param("periodId", ParseIntPipe) periodId: number,
  ) {
    const enrollment = await this.enrollments.findAny(id);
    return this.memberships.remove(enrollment.id, periodId);
  }
}
