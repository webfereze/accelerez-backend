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
import { ClientVideoStatus } from "@shared/enums/accelerez.enum";
import { EnrollmentEntity } from "./enrollment.entity";
import { UserEntity } from "./user.entity";

/**
 * A video the client filmed of themselves, for their trainer to correct.
 *
 * This is the half of the product that makes online coaching work at all: form
 * is the thing a coach cannot assess from a spreadsheet. It belongs to an
 * enrolment rather than to a user, so the pair it is visible to is the pair the
 * row already names — nobody else, including another trainer the same client
 * works with.
 *
 * Either an uploaded file or a link. Uploads land wherever `UploadService`
 * writes (local disk now, object storage when the variables are set); a client
 * who would rather paste an unlisted YouTube link may, because a phone
 * recording of a squat is sometimes 400 MB.
 *
 * `PENDING` is a promise: the trainer's dashboard counts these, and a video
 * that nobody is told about is a feature clients use once.
 */
@Entity({ name: "client_videos" })
@Index(["enrollmentId", "createdAt"])
@Index(["status", "createdAt"])
export class ClientVideoEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  enrollmentId: number;

  @ManyToOne(() => EnrollmentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "enrollmentId" })
  enrollment: EnrollmentEntity;

  @Column({ type: "varchar", length: 200 })
  title: string;

  /** What the client wants looked at — "mă doare genunchiul la a treia serie". */
  @Column({ type: "text", nullable: true })
  note: string | null;

  /** Set when the file was uploaded here. Mutually exclusive with `url`. */
  @Column({ type: "varchar", length: 500, nullable: true })
  filePath: string | null;

  /** Set when the client linked one instead. */
  @Column({ type: "varchar", length: 1000, nullable: true })
  url: string | null;

  /** Bytes. Shown to the client, and what a storage quota would count. */
  @Column({ type: "bigint", nullable: true })
  fileSize: number | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  mimeType: string | null;

  @Index()
  @Column({
    type: "enum",
    enum: ClientVideoStatus,
    default: ClientVideoStatus.PENDING,
  })
  status: ClientVideoStatus;

  /** The trainer's answer. Its presence is what flips the status. */
  @Column({ type: "text", nullable: true })
  feedback: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt: Date | null;

  /**
   * When the **client** last opened this recording.
   *
   * What it is for: telling them a reply is waiting. A trainer's answer arrives
   * inside a tab the client is not looking at, and without a "last seen" there
   * is no way to mark the tab — the client finds the correction whenever they
   * happen to look, which for most people is never.
   *
   * Only the client's side is tracked. The trainer's unanswered videos are
   * already counted by `status = PENDING`, which is a stronger signal than
   * "opened": a coach can watch a video and still owe an answer.
   */
  @Column({ type: "datetime", nullable: true })
  clientSeenAt: Date | null;

  @Column({ nullable: true })
  reviewedById: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "reviewedById" })
  reviewedBy: UserEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
