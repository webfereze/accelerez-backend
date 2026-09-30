import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Translated } from "@shared/types/translated";
import type { PublishedLocales } from "@shared/types/locales";
import { PageStatus } from "@shared/enums/page-status.enum";
import { Specialization, TrainingFormat } from "@shared/enums/accelerez.enum";
import { UserEntity } from "./user.entity";
import { decimalToNumber } from "@shared/utils/decimal";

/**
 * A trainer's public profile — and the thing clients enrol with.
 *
 * Separate from `UserEntity` for two reasons that both bite later if ignored:
 *
 * - **It is content.** It has translations, a slug per language, SEO fields, a
 *   draft state and a block body. An account has none of those, and putting
 *   `bio` on `users` means the login table grows a JSON column every time
 *   marketing wants another field.
 * - **It outlives the account.** A trainer who stops working still has a
 *   profile clients' history points at. Unpublishing is a status change here,
 *   not a deleted user with orphaned enrolments.
 *
 * One row per account, enforced by the unique `userId`. The account is created
 * by an administrator together with the profile — see `AdminTrainerController`.
 */
@Entity({ name: "trainers" })
@Index(["status", "sortOrder"])
export class TrainerEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /**
   * The account this profile belongs to. Unique: a second profile for the same
   * login would make "my clients" ambiguous in the portal.
   */
  @Index({ unique: true })
  @Column()
  userId: number;

  @OneToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: UserEntity;

  /**
   * A URL segment per language. Matched against the requested locale's slug
   * only — `/hu/antrenori/<slug-romanesc>` is a 404, not a redirect.
   */
  @Column({ type: "json" })
  slug: Translated;

  /**
   * The name shown publicly, which is not always the account's name: coaches
   * trade under a stage name often enough that deriving it from `firstName`
   * would be wrong on the profiles that matter most.
   */
  @Column({ type: "varchar", length: 160 })
  displayName: string;

  /** One line under the name — "Antrenor personal & nutriție sportivă". */
  @Column({ type: "json", nullable: true })
  headline: Translated;

  /** A paragraph for cards and the share preview. */
  @Column({ type: "json", nullable: true })
  excerpt: Translated;

  /**
   * The long profile, as blocks — so a trainer's page can carry a gallery, a
   * results band or a call to action rather than only prose.
   */
  @Column({ type: "json", nullable: true })
  content: unknown[];

  @Column({ type: "varchar", length: 500, nullable: true })
  photo: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  coverImage: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  county: string | null;

  /**
   * Where the work happens. An array: a coach who trains in a gym and also
   * takes online clients is the normal case, not the exception.
   */
  @Column({ type: "json", nullable: true })
  formats: TrainingFormat[];

  /** What they are for — see `Specialization`. Several per trainer. */
  @Column({ type: "json", nullable: true })
  specializations: Specialization[];

  @Column({ type: "smallint", nullable: true })
  yearsExperience: number | null;

  /**
   * Certifications, as `{ name, issuer, year }`. A JSON array rather than a
   * table: nothing queries them, they are only ever read whole on one page, and
   * a table would buy a join for a list of three strings.
   */
  @Column({ type: "json", nullable: true })
  certifications: { name: string; issuer?: string; year?: number }[];

  /**
   * What a month with this trainer costs. Nullable — a coach may prefer to
   * discuss it, and printing "0 RON" is worse than printing nothing.
   *
   * MySQL returns `DECIMAL` as a string; the transformer keeps it a number on
   * this side so arithmetic in a report is arithmetic and not concatenation.
   */
  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalToNumber,
  })
  monthlyPrice: number | null;

  @Column({ type: "char", length: 3, default: "RON" })
  currency: string;

  /**
   * How many active clients they will take. Null means no stated limit.
   *
   * It is not enforced as a hard cap — a trainer who is one over their number
   * should not be stopped from accepting a client they already agreed to take.
   * It drives "locuri disponibile" on the profile and a warning in the portal.
   */
  @Column({ type: "smallint", nullable: true })
  capacity: number | null;

  /**
   * Whether the profile shows a sign-up button at all. The switch a trainer
   * flips themselves when they are full, so the directory stops sending them
   * requests they will only decline.
   */
  @Index()
  @Column({ type: "boolean", default: true })
  isAcceptingClients: boolean;

  /** Lifts a profile onto the home page. */
  @Index()
  @Column({ type: "boolean", default: false })
  isFeatured: boolean;

  @Column({ type: "varchar", length: 40, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 190, nullable: true })
  publicEmail: string | null;

  /**
   * Social profiles, as `{ instagram, facebook, youtube, tiktok, website }`.
   * One JSON column rather than five varchars: the set changes with fashion,
   * and each change would otherwise be a migration.
   */
  @Column({ type: "json", nullable: true })
  social: Record<string, string>;

  @Index()
  @Column({ type: "enum", enum: PageStatus, default: PageStatus.DRAFT })
  status: PageStatus;

  /** See `PublishedLocales` — a missing translation is a 404, not a fallback. */
  @Column({ type: "json", nullable: true })
  publishedLocales: PublishedLocales;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @Column({ type: "json", nullable: true })
  seoTitle: Translated;

  @Column({ type: "json", nullable: true })
  seoDescription: Translated;

  @Column({ type: "boolean", default: false })
  noindex: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
