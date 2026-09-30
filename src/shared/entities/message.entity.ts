import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { EnrollmentEntity } from "./enrollment.entity";
import { UserEntity } from "./user.entity";

/** What can travel with a message. Mirrors what `UploadService` accepts. */
export type MessageAttachment = {
  kind: "video" | "image" | "document" | "link";
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
};

/**
 * One message between a client and their trainer.
 *
 * **It hangs off the enrolment, like everything else private here.** That row
 * already names exactly the two people who may read it, so there is no separate
 * conversation to create, no membership list to keep in step, and a client who
 * works with two coaches gets two threads without anything having to route
 * between them.
 *
 * **Not paywalled, deliberately.** Everything a trainer *produces* — the plan,
 * the diet, the videos — is behind the paid month, but talking is not: the most
 * common reason a month is unpaid is that the two of them need to sort
 * something out, and a product that silences them at exactly that moment makes
 * the problem worse. The client's area says the month is closed; the thread
 * stays open.
 *
 * `readAt` is a single timestamp rather than a per-recipient table because a
 * thread has exactly two people in it. It means "the *other* one has seen this",
 * and the sender's own messages are never counted as unread for them.
 */
@Entity({ name: "messages" })
@Index(["enrollmentId", "createdAt"])
export class MessageEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  enrollmentId: number;

  @ManyToOne(() => EnrollmentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "enrollmentId" })
  enrollment: EnrollmentEntity;

  /** Who wrote it. Either side of the pair — the thread is symmetrical. */
  @Column()
  senderId: number;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "senderId" })
  sender: UserEntity;

  /**
   * The text. Optional, because a message may be nothing but a video — but the
   * service refuses one that is neither text nor attachment, which is the only
   * combination this shape allows and nobody can read.
   */
  @Column({ type: "text", nullable: true })
  body: string | null;

  /**
   * Files and links, as a JSON array — see `MessageAttachment`.
   *
   * A column rather than a table: nothing queries an attachment, they are only
   * ever read with the message they belong to, and a join would buy nothing for
   * a list of two objects.
   */
  @Column({ type: "json", nullable: true })
  attachments: MessageAttachment[];

  /** When the other side read it. Null while it is still unread. */
  @Index()
  @Column({ type: "datetime", nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
