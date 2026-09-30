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
import { EnrollmentEntity } from "./enrollment.entity";
import { decimalToNumber } from "@shared/utils/decimal";

/**
 * One point on a client's timeline: a date, a photograph, a weight, a note.
 *
 * **A row per moment, not a "before" and an "after" column.** Two columns can
 * only ever tell one story, and it is the wrong one: progress is not a pair of
 * photographs, it is a sequence, and the interesting comparison changes with
 * time — this month against last, today against the day they started, the
 * summer against the winter. A sequence answers all of those; a pair answers
 * none of them after the third month.
 *
 * `takenAt` is the date the photograph is *of*, supplied by the client, not the
 * upload timestamp. People photograph themselves on Sunday and upload on
 * Wednesday, and a timeline ordered by upload time puts them in the wrong week.
 *
 * Everything but the date is optional, deliberately. Someone who only records a
 * weight is keeping a useful log; someone who only uploads a photograph is too.
 * Requiring both would mean the month they had no scales is a month missing
 * from their history.
 *
 * **Visible to the pair, and to nobody else.** These are photographs of a
 * person's body — the most sensitive thing this product stores. They hang off
 * the enrolment for the same reason the videos do: the enrolment already names
 * exactly the two people who may see them, and when it ends they stop being
 * visible without anything having to be deleted or remembered.
 */
@Entity({ name: "progress_entries" })
@Index(["enrollmentId", "takenAt"])
export class ProgressEntryEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  enrollmentId: number;

  @ManyToOne(() => EnrollmentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "enrollmentId" })
  enrollment: EnrollmentEntity;

  /** The day the photograph is of — see the class note. */
  @Column({ type: "date" })
  takenAt: string;

  /**
   * Up to three photographs, as `{ url, pose }` where pose is `front`, `side`
   * or `back`.
   *
   * A JSON array rather than three columns: a client who photographs only the
   * front should not leave two empty columns behind, and the comparison view
   * pairs the same pose across two dates by reading this rather than by
   * guessing which column meant what.
   */
  @Column({ type: "json", nullable: true })
  photos: { url: string; pose?: "front" | "side" | "back" }[];

  /** Kilograms. `decimal` because 72.4 in a float column becomes 72.40000001. */
  @Column({
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: decimalToNumber,
  })
  weightKg: number | null;

  /** Waist, hips, chest, arm — centimetres, as `{ waist: 84, … }`. */
  @Column({ type: "json", nullable: true })
  measurements: Record<string, number>;

  /** What the client wants to remember about that week. */
  @Column({ type: "text", nullable: true })
  note: string | null;

  /**
   * The trainer's remark on this point. Optional, and the reason a client keeps
   * filling the log: a measurement nobody ever comments on is a form.
   */
  @Column({ type: "text", nullable: true })
  trainerNote: string | null;

  /**
   * Whether the client is willing for this to be shown publicly, one day, as a
   * transformation.
   *
   * **Defaults to false and is the client's to set.** A trainer who could tick
   * this box for them would be publishing photographs of somebody's body on
   * their own say-so. Nothing in the product reads it yet; it exists so that
   * when a "rezultate" page is built, consent is already recorded per
   * photograph rather than assumed retroactively.
   */
  @Column({ type: "boolean", default: false })
  consentToShare: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
