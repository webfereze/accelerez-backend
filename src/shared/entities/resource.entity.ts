import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ResourceType, ResourceVisibility } from "@shared/enums/accelerez.enum";
import { TrainerEntity } from "./trainer.entity";
import { EnrollmentEntity } from "./enrollment.entity";

/**
 * Something a trainer gives a client: a video, a spreadsheet, a diet, a tip,
 * a document.
 *
 * **Not translated, on purpose.** Every other body of text in this codebase is
 * a `Translated` JSON column; this one is a plain string. A trainer writes one
 * client one plan, in the language the two of them speak, and asking a coach to
 * fill three tabs before their client can read Monday's workout is how the
 * feature goes unused. Translations belong to marketing copy, not to
 * correspondence.
 *
 * Two audiences, decided by `visibility`:
 *
 * - `LIBRARY` — the trainer's standing material, visible to **every** active
 *   client of theirs. `enrollmentId` is null.
 * - `CLIENT` — written for one person. `enrollmentId` says who, and no other
 *   client can read it however they guess at the id.
 *
 * Either way the client only sees it while their month is paid: the paywall is
 * applied when these are fetched, never stored on the row.
 */
@Entity({ name: "resources" })
@Index(["trainerId", "visibility", "sortOrder"])
@Index(["enrollmentId", "sortOrder"])
export class ResourceEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** The author. Kept even on a client-specific row, so a trainer's library
   * and their assignments list together and survive an ended enrolment. */
  @Column()
  trainerId: number;

  @ManyToOne(() => TrainerEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "trainerId" })
  trainer: TrainerEntity;

  /** Null for library material — see the class note. */
  @Column({ nullable: true })
  enrollmentId: number | null;

  @ManyToOne(() => EnrollmentEntity, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "enrollmentId" })
  enrollment: EnrollmentEntity | null;

  @Column({
    type: "enum",
    enum: ResourceVisibility,
    default: ResourceVisibility.CLIENT,
  })
  visibility: ResourceVisibility;

  /** Decides how it renders, not just which icon it gets — see `ResourceType`. */
  @Index()
  @Column({ type: "enum", enum: ResourceType, default: ResourceType.VIDEO })
  type: ResourceType;

  @Column({ type: "varchar", length: 200 })
  title: string;

  /** A line of context — "3 serii x 12, luni și joi". */
  @Column({ type: "text", nullable: true })
  description: string | null;

  /**
   * Where it lives when it lives somewhere else: a YouTube watch URL, a Google
   * Sheets link, any address the trainer pastes.
   *
   * Long because Google's share links routinely pass 500 characters, and a
   * truncated link fails at the moment a client clicks it rather than at the
   * moment it is saved.
   */
  @Column({ type: "varchar", length: 1000, nullable: true })
  url: string | null;

  /** Set instead of `url` when the trainer uploaded a file (a PDF plan). */
  @Column({ type: "varchar", length: 500, nullable: true })
  filePath: string | null;

  /**
   * The body, for the types that *are* the text — a diet or a tip. Rich HTML
   * from the same editor the CMS uses, sanitised on save.
   */
  @Column({ type: "longtext", nullable: true })
  body: string | null;

  /**
   * Hidden while a trainer is still writing it. A half-finished diet that a
   * client can already read is worse than no diet.
   */
  @Column({ type: "boolean", default: true })
  isPublished: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  /** When the client first opened it — what a trainer actually wants to know. */
  @Column({ type: "datetime", nullable: true })
  seenAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
