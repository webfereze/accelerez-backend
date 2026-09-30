import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserEntity } from "@shared/entities";

/**
 * Injects the authenticated user (populated by `JwtStrategy.validate`).
 *
 *   findAll(@CurrentUser() user: UserEntity) { … }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity =>
    ctx.switchToHttp().getRequest().user,
);
