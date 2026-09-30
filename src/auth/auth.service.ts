import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { UserEntity } from "@shared/entities";
import { STAFF_ROLES, UserRole } from "@shared/enums/user-role.enum";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ChangePasswordDto, UpdateAccountDto } from "../portal/dto/portal.dto";
import { assignSlug } from "@shared/utils/user-slug";
import type { JwtPayload } from "./strategies/jwt.strategy";

/** The user shape returned to the client — never includes the password hash. */
export type PublicUser = {
  id: number;
  email: string;
  /** The handle the portal's addresses use instead of the id. */
  slug: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  locale: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
  ) {}

  /**
   * One sign-in for everybody, gated by `staffOnly`.
   *
   * The back office passes `true`, so a client's perfectly valid credentials
   * cannot open the admin panel even though both live in the same table. The
   * portal passes `false` and gets trainers, clients and administrators.
   */
  async login(dto: LoginDto, staffOnly = false) {
    // `password` is `select: false` on the entity, so ask for it explicitly.
    const user = await this.users.findOne({
      where: { email: dto.email },
      select: [
        "id", "email", "slug", "firstName", "lastName", "phone", "locale",
        "role", "isActive", "password",
      ],
    });

    // Compare against a dummy hash when the account is missing so a wrong
    // e-mail and a wrong password take the same time — no user enumeration.
    const hash = user?.password ?? DUMMY_HASH;
    const passwordMatches = await bcrypt.compare(dto.password, hash);

    const isStaff = user ? STAFF_ROLES.includes(user.role) : false;

    if (!user || !passwordMatches || !user.isActive || (staffOnly && !isStaff)) {
      throw new UnauthorizedException("E-mail sau parolă greșită.");
    }

    // Recorded after the checks pass, so a failed attempt leaves no trace of a
    // successful one. Not awaited — a slow write must not delay the response.
    void this.users.update(user.id, { lastLoginAt: new Date() });

    return {
      accessToken: await this.signToken(user),
      user: toPublicUser(user),
    };
  }

  /** The account behind the current token — used to restore a session. */
  me(user: UserEntity): PublicUser {
    return toPublicUser(user);
  }

  /**
   * Public registration. Creates a **client** and signs them straight in.
   *
   * Signed in rather than sent to the login form: the person who just typed
   * their password is the person we just verified, and asking them to type it
   * again is friction with no security in it.
   *
   * The role is not taken from the request — see `RegisterDto`.
   */
  async register(dto: RegisterDto) {
    if (dto.website) {
      // Honeypot. Answer as if it worked; a bot that learns why it failed
      // passes next time.
      throw new BadRequestException("Înregistrarea nu a putut fi finalizată.");
    }

    if (!dto.acceptTerms) {
      throw new BadRequestException("Trebuie să accepți termenii și condițiile.");
    }

    const email = dto.email.trim().toLowerCase();
    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException("Există deja un cont cu această adresă de e-mail.");
    }

    const user = await this.users.save(
      this.users.create({
        email,
        slug: await assignSlug(this.users, {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email,
        }),
        password: await bcrypt.hash(dto.password, 10),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName?.trim() ?? null,
        phone: dto.phone ?? null,
        locale: (dto.locale as never) ?? "ro",
        role: UserRole.CLIENT,
        isActive: true,
      }),
    );

    return {
      accessToken: await this.signToken(user),
      user: toPublicUser(user),
    };
  }

  /** Name, phone, language. Not the e-mail — that is the login itself. */
  async updateAccount(user: UserEntity, dto: UpdateAccountDto): Promise<PublicUser> {
    await this.users.update(user.id, {
      firstName: dto.firstName ?? user.firstName,
      lastName: dto.lastName ?? user.lastName,
      phone: dto.phone ?? user.phone,
      locale: (dto.locale as never) ?? user.locale,
    });

    return toPublicUser(await this.users.findOne({ where: { id: user.id } }));
  }

  /**
   * Changing a password requires the current one.
   *
   * A token is enough to *use* the account; it should not be enough to take it
   * over. A stolen session that can silently change the password locks the real
   * owner out of their own training plan.
   */
  async changePassword(user: UserEntity, dto: ChangePasswordDto): Promise<void> {
    const row = await this.users.findOne({
      where: { id: user.id },
      select: ["id", "password"],
    });

    if (!row || !(await bcrypt.compare(dto.currentPassword, row.password))) {
      throw new UnauthorizedException("Parola actuală nu este corectă.");
    }

    await this.users.update(user.id, {
      password: await bcrypt.hash(dto.newPassword, 10),
    });
  }

  private signToken(user: UserEntity): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwt.signAsync(payload);
  }
}

function toPublicUser(user: UserEntity): PublicUser {
  return {
    id: user.id,
    email: user.email,
    slug: user.slug ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    phone: user.phone ?? null,
    locale: user.locale ?? "ro",
    role: user.role,
  };
}

/** A valid bcrypt hash of a value nobody can guess. */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
