import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { PortalGuard } from "./guards/portal.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { UserEntity } from "@shared/entities";
import { ChangePasswordDto, UpdateAccountDto } from "../portal/dto/portal.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/admin/login → { accessToken, user }
   *
   * Staff only. Tightly throttled: this is the one endpoint worth brute-forcing.
   */
  @Post("admin/login")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  adminLogin(@Body() dto: LoginDto) {
    return this.authService.login(dto, true);
  }

  /**
   * POST /auth/login → { accessToken, user }
   *
   * The portal: trainers and clients, one form. Which dashboard they land on is
   * decided by the role in the response, not by which address they signed in
   * at — two login pages means a client who bookmarked the wrong one is told
   * their correct password is wrong.
   */
  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto, false);
  }

  /**
   * POST /auth/register → { accessToken, user }
   *
   * Creates a client. Throttled harder than a login: a registration endpoint is
   * how a database fills with accounts nobody made.
   */
  @Post("register")
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** GET /auth/me → the account behind the bearer token. */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: UserEntity) {
    return this.authService.me(user);
  }

  /** Name, phone, language. The e-mail is the login and does not change here. */
  @Patch("account")
  @UseGuards(JwtAuthGuard, PortalGuard)
  updateAccount(@CurrentUser() user: UserEntity, @Body() dto: UpdateAccountDto) {
    return this.authService.updateAccount(user, dto);
  }

  /** Requires the current password — a token alone must not take an account over. */
  @Post("account/password")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PortalGuard)
  changePassword(@CurrentUser() user: UserEntity, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }
}
