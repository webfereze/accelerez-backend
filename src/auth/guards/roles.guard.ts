import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@shared/enums/user-role.enum";
import { ROLES_KEY } from "../decorators/roles.decorator";

/** Checks the `@Roles(...)` metadata against the authenticated user's role. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() on the route → any authenticated user passes.
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    return !!user && required.includes(user.role);
  }
}
