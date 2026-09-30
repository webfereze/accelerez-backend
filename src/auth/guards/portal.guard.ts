import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { PORTAL_ROLES, UserRole } from "@shared/enums/user-role.enum";

/**
 * The mirror of `StaffGuard`: the private area, for trainers and clients.
 *
 * Administrators pass too — an admin looking into a support question should not
 * need a second account to see what the client sees. Editors do not: they
 * manage site content and have no business inside somebody's training plan.
 *
 *   @UseGuards(JwtAuthGuard, PortalGuard)
 */
@Injectable()
export class PortalGuard implements CanActivate {
  private static readonly ALLOWED = [...PORTAL_ROLES, UserRole.ADMIN];

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    return !!user?.isActive && PortalGuard.ALLOWED.includes(user.role);
  }
}
