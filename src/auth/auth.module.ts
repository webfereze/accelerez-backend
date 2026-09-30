import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { SharedModule } from "@shared/shared.module";
import { config } from "@shared/config/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: config.get("auth.jwtSecret"),
      // Back-office sessions last a working day.
      signOptions: { expiresIn: "12h" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // `JwtModule` is exported so `UserModule` signs customer tokens with the
  // very same key and options — one token format across the product.
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
