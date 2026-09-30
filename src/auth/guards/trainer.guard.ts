import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { UserRole } from "@shared/enums/user-role.enum";

/**
 * A trainer's own portal.
 *
 * Only `TRAINER`. An administrator is deliberately **not** let through: every
 * route behind this guard answers "my clients", and an admin has none — the
 * endpoint would either throw for a missing profile or, worse, silently show
 * somebody else's list. Admin oversight is its own controller under `/admin`,
 * where the trainer is named in the URL rather than inferred from the token.
 */
@Injectable()
export class TrainerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    return !!user?.isActive && user.role === UserRole.TRAINER;
  }
}
