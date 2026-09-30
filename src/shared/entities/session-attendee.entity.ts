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
import { AttendanceStatus } from "@shared/enums/accelerez.enum";
import { TrainingSessionEntity } from "./training-session.entity";
import { EnrollmentEntity } from "./enrollment.entity";

/**
 * One person in one class.
 *
 * **It points at the enrolment, not at the user.** The enrolment already names
 * the pair, carries the paid months and ends when the collaboration does — so a
 * client who leaves stops appearing in that trainer's calendar without anything
 * having to be cleaned up, and a trainer can never add somebody who is not
 * theirs, because they have no enrolment to reference.
 *
 * `(sessionId, enrollmentId)` is unique: adding the same person twice is a
 * double click, not an intention, and two rows would make a group of five
 * report six.
 */
@Entity({ name: "session_attendees" })
@Index(["sessionId", "enrollmentId"], { unique: true })
@Index(["enrollmentId", "id"])
export class SessionAttendeeEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  sessionId: number;

  @ManyToOne(() => TrainingSessionEntity, (session) => session.attendees, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "sessionId" })
  session: TrainingSessionEntity;

  @Column()
  enrollmentId: number;

  @ManyToOne(() => EnrollmentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "enrollmentId" })
  enrollment: EnrollmentEntity;

  @Column({ type: "enum", enum: AttendanceStatus, default: AttendanceStatus.BOOKED })
  status: AttendanceStatus;

  /** What happened — "a anunțat că întârzie", "a lucrat doar partea de sus". */
  @Column({ type: "varchar", length: 300, nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
