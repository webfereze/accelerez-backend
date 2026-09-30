import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { UserRole } from "@shared/enums/user-role.enum";

/**
 * The client area. Only `CLIENT`, for the same reason `TrainerGuard` is only
 * `TRAINER`: these routes mean "my enrolments", and a role that has none would
 * get an empty screen that looks like a bug.
 */
@Injectable()
export class ClientGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    return !!user?.isActive && user.role === UserRole.CLIENT;
  }
}
