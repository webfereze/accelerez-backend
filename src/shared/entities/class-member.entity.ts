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
import { TrainingClassEntity } from "./training-class.entity";
import { UserEntity } from "./user.entity";

/**
 * Somebody who joined a class.
 *
 * **Deliberately not an `EnrollmentEntity`.** That row is a client working with
 * one coach: it carries paid periods, a training plan, videos and a private
 * thread, and every one of those is meaningless for a Tuesday group class. The
 * two were nearly made one, and the give-away was the paywall — a class is paid
 * for at the door or by the month with the coach, and putting it behind the
 * same period table would have closed somebody's 1:1 plan because they skipped
 * a group session.
 *
 * `LEFT` rather than a deleted row: a class's history is who came and for how
 * long, and a coach who cannot see that somebody left in March cannot tell an
 * empty class from a new one.
 */
export type ClassMemberStatus = "active" | "left";

@Entity({ name: "class_members" })
@Index(["classId", "clientId"], { unique: true })
@Index(["clientId", "status"])
export class ClassMemberEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  classId: number;

  @ManyToOne(() => TrainingClassEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "classId" })
  trainingClass: TrainingClassEntity;

  @Column()
  clientId: number;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "clientId" })
  client: UserEntity;

  @Column({ type: "varchar", length: 10, default: "active" })
  status: ClassMemberStatus;

  /** What they wrote when joining — a question, an injury worth knowing about. */
  @Column({ type: "text", nullable: true })
  note: string | null;

  /** The coach's own note about this member. Never returned to the client. */
  @Column({ type: "text", nullable: true })
  trainerNote: string | null;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
