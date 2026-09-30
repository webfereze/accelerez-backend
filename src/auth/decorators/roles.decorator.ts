import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@shared/enums/user-role.enum";

export const ROLES_KEY = "roles";

/**
 * Restricts a route to the given roles. Used together with `RolesGuard`:
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.ADMIN)
 *
 * `StaffGuard` covers the common "any back-office account" case; reach for
 * `@Roles` when a route is admin-only and editors must be kept out.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
