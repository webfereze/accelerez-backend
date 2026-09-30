import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import {
  SessionKind,
  SessionLocation,
  SessionStatus,
} from "@shared/enums/accelerez.enum";
import { TrainerEntity } from "./trainer.entity";
import { SessionAttendeeEntity } from "./session-attendee.entity";

/**
 * One class in a trainer's calendar.
 *
 * **It belongs to the trainer, not to a client.** A group class has several
 * attendees and a one-to-one has exactly one, so hanging the session off an
 * enrolment would mean copying the same class into six rows and then keeping
 * six copies of a cancelled time in step. Who is coming is
 * `SessionAttendeeEntity`, one row per person.
 *
 * `startsAt` and `endsAt` are stored as plain datetimes in the platform's own
 * time — everyone involved is in the same country, and a trainer typing "18:00"
 * means six in the evening where they are. The day this serves two time zones
 * it becomes a UTC instant plus a zone, and that is a migration rather than a
 * reinterpretation of what is already stored.
 *
 * **Recurrence is deliberately absent.** "Every Tuesday" is what a trainer
 * wants to type and the least useful thing to store: the fourth Tuesday is
 * moved, the sixth is cancelled, and a rule with exceptions is a rule nobody
 * can read off a screen. The calendar duplicates a week forward instead, which
 * produces real rows a trainer can each move.
 */
@Entity({ name: "training_sessions" })
@Index(["trainerId", "startsAt"])
@Index(["status", "startsAt"])
export class TrainingSessionEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  trainerId: number;

  @ManyToOne(() => TrainerEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "trainerId" })
  trainer: TrainerEntity;

  /** "Full body A", "Evaluare inițială". Not translated — see `ResourceEntity`. */
  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "enum", enum: SessionKind, default: SessionKind.ONE_TO_ONE })
  kind: SessionKind;

  @Index()
  @Column({ type: "datetime" })
  startsAt: Date;

  @Column({ type: "datetime" })
  endsAt: Date;

  @Column({ type: "enum", enum: SessionLocation, default: SessionLocation.GYM })
  location: SessionLocation;

  /** The gym and the room, or the address. Free text: it is read, never queried. */
  @Column({ type: "varchar", length: 300, nullable: true })
  place: string | null;

  /** For an online session. Long because meeting links routinely are. */
  @Column({ type: "varchar", length: 1000, nullable: true })
  meetingUrl: string | null;

  /**
   * How many people fit. Null on a one-to-one, where the answer is one and
   * storing it would be a number somebody could edit into a contradiction.
   */
  @Column({ type: "smallint", nullable: true })
  capacity: number | null;

  @Index()
  @Column({ type: "enum", enum: SessionStatus, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  /** Why it was called off. Shown to the attendees — see `SessionStatus`. */
  @Column({ type: "varchar", length: 300, nullable: true })
  cancelReason: string | null;

  @OneToMany(() => SessionAttendeeEntity, (attendee) => attendee.session)
  attendees: SessionAttendeeEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
