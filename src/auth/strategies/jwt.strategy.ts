import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "@shared/entities";
import { config } from "@shared/config/config";

export type JwtPayload = {
  /** user id */
  sub: number;
  email: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get("auth.jwtSecret"),
    });
  }

  /**
   * Runs on every guarded request. The user is re-read from the database so a
   * deactivated or deleted account stops working immediately, rather than
   * staying valid until its token expires.
   */
  async validate(payload: JwtPayload): Promise<UserEntity> {
    const user = await this.users.findOne({ where: { id: payload.sub } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
