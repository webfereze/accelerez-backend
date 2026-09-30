import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Translated } from "@shared/types/translated";
import type { PublishedLocales } from "@shared/types/locales";
import { PageStatus } from "@shared/enums/page-status.enum";
import { SessionLocation, Specialization } from "@shared/enums/accelerez.enum";
import { decimalToNumber } from "@shared/utils/decimal";

/**
 * A class somebody can join: CrossFit, box, yoga, HIIT.
 *
 * **Not the same thing as a trainer, and not the same thing as a session.** A
 * trainer is a person you enrol with one-to-one; a session is one occurrence in
 * a calendar; a class is the *offer* — a named, recurring thing with a price, a
 * duration and one or more coaches who run it. The three were nearly modelled
 * as one, and the give-away was the price: a trainer has a monthly price, a
 * session has none, and a class has two.
 *
 * **Two prices, because both are real.** Somebody dropping in once pays per
 * session; somebody committing pays per month. Either may be absent — a class
 * that is only sold monthly leaves the per-session price empty rather than
 * inventing one, and the card then shows a single figure.
 *
 * The trainers who run it are ids in a JSON column rather than a join table:
 * nothing queries classes *by* trainer except one list on a profile, the set is
 * two or three ids, and a table would buy a join for that.
 */
@Entity({ name: "training_classes" })
@Index(["status", "sortOrder"])
export class TrainingClassEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** A URL segment per language — matched against the requested locale only. */
  @Column({ type: "json" })
  slug: Translated;

  @Column({ type: "json" })
  title: Translated;

  /** The two or three lines on the card. */
  @Column({ type: "json", nullable: true })
  excerpt: Translated;

  /** The long description, as blocks — a class page can carry a gallery. */
  @Column({ type: "json", nullable: true })
  content: unknown[];

  /** Portrait, like the cards are drawn. */
  @Column({ type: "varchar", length: 500, nullable: true })
  image: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  imageAlt: string | null;

  /**
   * When it runs, in words: "Luni și joi · 18:00".
   *
   * Free text rather than a structure, deliberately. A class's rhythm is read,
   * never queried, and the structured version of "marți și joi, dar nu în
   * vacanță" is a rule with exceptions that nobody can edit. The calendar
   * module holds the actual occurrences; this is the sentence on the card.
   */
  @Column({ type: "json", nullable: true })
  scheduleText: Translated;

  /**
   * Which days it runs, as ISO weekday numbers — 1 is Monday, 7 is Sunday.
   *
   * **This exists so the product can answer "when is my next training".**
   * `scheduleText` is what a reader sees and cannot be computed with; these two
   * fields are what the countdown is derived from. Both are optional: a class
   * with no structured schedule simply shows its sentence and no next date,
   * which is honest, rather than a date somebody guessed.
   *
   * ISO numbering rather than `Date.getDay()`'s Sunday-is-zero: every person
   * writing this down means Monday when they say "the first day", and the
   * off-by-one is invisible until a Sunday class shows up on Monday.
   */
  @Column({ type: "json", nullable: true })
  weekdays: number[];

  /** `HH:MM`, 24-hour, in the platform's own time. */
  @Column({ type: "varchar", length: 5, nullable: true })
  startTime: string | null;

  /** For a course with a start date. Null for something running continuously. */
  @Column({ type: "date", nullable: true })
  startsOn: string | null;

  /**
   * Where an online class actually happens.
   *
   * Shown only to people who have joined: a meeting link on a public page is a
   * meeting anybody can walk into, and the whole point of the class having
   * members is that it has members.
   */
  @Column({ type: "varchar", length: 1000, nullable: true })
  meetingUrl: string | null;

  /** Minutes. Null hides it rather than printing "0 min". */
  @Column({ type: "smallint", nullable: true })
  durationMinutes: number | null;

  /** What one session costs, for somebody dropping in. */
  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalToNumber,
  })
  pricePerSession: number | null;

  /** What a month of it costs. Either price may be absent — see the class note. */
  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalToNumber,
  })
  pricePerMonth: number | null;

  @Column({ type: "char", length: 3, default: "RON" })
  currency: string;

  /**
   * The ribbon across the corner of the card: "30% reducere", "Locuri limitate".
   *
   * Translated and free text, because it is a marketing line and the day it
   * becomes a closed list is the day somebody needs a word that is not on it.
   * Empty means no ribbon — which is the normal state, and a page where every
   * card shouts is a page where none of them do.
   */
  @Column({ type: "json", nullable: true })
  ribbon: Translated;

  @Column({ type: "enum", enum: SessionLocation, default: SessionLocation.GYM })
  location: SessionLocation;

  @Column({ type: "varchar", length: 300, nullable: true })
  place: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  city: string | null;

  /** How many fit in one session. Shown as "locuri" where it is set. */
  @Column({ type: "smallint", nullable: true })
  capacity: number | null;

  /** What it is for — the same closed list the trainers use. */
  @Column({ type: "json", nullable: true })
  specializations: Specialization[];

  /** The coaches who run it. Ids, not a join table — see the class note. */
  @Column({ type: "json", nullable: true })
  trainerIds: number[];

  @Index()
  @Column({ type: "enum", enum: PageStatus, default: PageStatus.DRAFT })
  status: PageStatus;

  /** Lifts it into the home page's teaser row. */
  @Index()
  @Column({ type: "boolean", default: false })
  isFeatured: boolean;

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
