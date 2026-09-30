import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserRole } from "@shared/enums/user-role.enum";
import type { Locale } from "@shared/types/translated";

/**
 * Everyone who signs in, separated by `role` — administrators, editors,
 * trainers and clients.
 *
 * One table, because all four authenticate the same way and an e-mail address
 * must be unique across the whole product: a client who later becomes a trainer
 * keeps their account rather than having two with the same address and
 * different passwords.
 *
 * The back office and the portal are still different endpoints behind different
 * guards — `StaffGuard` for `/admin`, `PortalGuard` for `/portal` — so a valid
 * client token cannot reach an admin route.
 *
 * A trainer's *profile* (bio, photo, specialisations, price) is not here: it is
 * `TrainerEntity`, one row per account, because it is public content with
 * translations and the account is not.
 */
@Entity({ name: "users" })
export class UserEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Index({ unique: true })
  @Column({ length: 190 })
  email: string;

  /**
   * A handle for this person, used in the portal's addresses instead of the id.
   *
   * **`/antrenor/cursanti/maria-ionescu`, not `/antrenor/cursanti/3`.** An id in
   * a URL invites somebody to try the next number, and even when the route
   * refuses them — and it does, every portal route resolves ownership from the
   * token — a sequential id leaks how many clients the platform has and which
   * account was created first.
   *
   * Built from the name and made unique with a suffix when two people share
   * one. Nullable because it is backfilled for the accounts that predate it;
   * `assignSlug` fills it on every account created since.
   */
  @Index({ unique: true })
  @Column({ type: "varchar", length: 190, nullable: true })
  slug: string | null;

  /** bcrypt hash. Never selected by default — opt in with `addSelect`. */
  @Column({ select: false })
  password: string;

  @Column({ length: 120, nullable: true })
  firstName: string;

  @Column({ length: 120, nullable: true })
  lastName: string;

  @Column({ length: 40, nullable: true })
  phone: string;

  @Index()
  @Column({ type: "enum", enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;

  /**
   * Preferred language — chosen at registration, changeable in the account, and
   * the language every e-mail to this person is written in.
   *
   * Romanian by default: it is the site's default locale and the language the
   * content is authored in.
   */
  @Column({ type: "varchar", length: 5, default: "ro" })
  locale: Locale;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "datetime", nullable: true })
  lastLoginAt: Date;

  /**
   * Password-reset token, stored as a **SHA-256 hash**. A leaked database dump
   * then yields no usable reset links, the same reasoning that keeps the
   * password itself hashed.
   */
  @Column({ type: "varchar", length: 64, nullable: true, select: false })
  resetTokenHash: string;

  @Column({ type: "datetime", nullable: true, select: false })
  resetTokenExpiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
