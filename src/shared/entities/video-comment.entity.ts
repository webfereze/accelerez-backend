import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ClientVideoEntity } from "./client-video.entity";
import { UserEntity } from "./user.entity";

/**
 * A remark on one recording, from either side.
 *
 * **This replaces the single `feedback` field on the video.** One field could
 * only ever hold one person's last word, and the exchange it has to support is
 * a conversation: the trainer corrects something, the client says they tried it
 * and the knee still hurts, the trainer answers again. With one field the
 * second message overwrites the first and the third has nowhere to go.
 *
 * `ClientVideoEntity.feedback` survives for the rows written before this
 * existed and is shown as the first remark on them — see `ClientVideoService`.
 * Nothing writes to it any more.
 *
 * Attached to the video rather than to the enrolment's thread on purpose: a
 * correction is about *this* set, and a comment that lives in the general
 * conversation is one nobody can find again three weeks later.
 */
@Entity({ name: "video_comments" })
@Index(["clientVideoId", "createdAt"])
export class VideoCommentEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  clientVideoId: number;

  @ManyToOne(() => ClientVideoEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "clientVideoId" })
  clientVideo: ClientVideoEntity;

  /** Either side of the pair — the thread is symmetrical, like the messages. */
  @Column()
  authorId: number;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "authorId" })
  author: UserEntity;

  @Column({ type: "text" })
  body: string;

  @CreateDateColumn()
  createdAt: Date;
}
