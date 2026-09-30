import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { UserRole } from "@shared/enums/user-role.enum";

/**
 * Admin-API gate: the account must be staff, not a customer.
 *
 * Customers and staff share one `users` table, so a customer's perfectly valid
 * token would otherwise pass `JwtAuthGuard` on an `/admin/*` route. Use it
 * paired with the JWT guard:
 *
 *   @UseGuards(JwtAuthGuard, StaffGuard)
 */
@Injectable()
export class StaffGuard implements CanActivate {
  private static readonly STAFF = [UserRole.ADMIN, UserRole.EDITOR];

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    return !!user && StaffGuard.STAFF.includes(user.role);
  }
}
