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
import { EnrollmentStatus } from "@shared/enums/accelerez.enum";
import { UserEntity } from "./user.entity";
import { TrainerEntity } from "./trainer.entity";
import { MembershipPeriodEntity } from "./membership-period.entity";

/**
 * One client training with one trainer — the spine of the product.
 *
 * Everything a client can see hangs off this row: the months that were paid,
 * the material their trainer assigned them, the videos they sent back. Access
 * is never computed from "is this user a client" but from "does this user have
 * an enrolment, is it active, and is this month paid on it".
 *
 * **A pair has at most one enrolment, ever.** A client who leaves and returns
 * reactivates this row rather than creating a second one, because two rows
 * would split their history in half and make the trainer's client list show
 * the same person twice. That is what the unique index is for.
 */
@Entity({ name: "enrollments" })
@Index(["trainerId", "status"])
@Index(["clientId", "trainerId"], { unique: true })
export class EnrollmentEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  clientId: number;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "clientId" })
  client: UserEntity;

  @Column()
  trainerId: number;

  @ManyToOne(() => TrainerEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "trainerId" })
  trainer: TrainerEntity;

  /**
   * Starts at `PENDING`: the client asked, the trainer has not answered yet.
   * Nothing is visible to the client in that state and no month is opened —
   * billing a person the trainer has not agreed to take would be the worst
   * possible first impression.
   */
  @Index()
  @Column({ type: "enum", enum: EnrollmentStatus, default: EnrollmentStatus.PENDING })
  status: EnrollmentStatus;

  /**
   * What the client wrote when they signed up — their goal, in their words.
   * The trainer reads this before accepting, and it is the one piece of the
   * request that is not a form field.
   */
  @Column({ type: "text", nullable: true })
  goal: string | null;

  /**
   * The trainer's own notes about this client. **Never returned to the client**
   * by any endpoint — see `EnrollmentService`. A note a coach writes for
   * themselves stops being honest the moment it might be read.
   */
  @Column({ type: "text", nullable: true })
  trainerNote: string | null;

  /** When the trainer accepted. Null while pending or declined. */
  @Column({ type: "datetime", nullable: true })
  acceptedAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  endedAt: Date | null;

  @OneToMany(() => MembershipPeriodEntity, (period) => period.enrollment)
  periods: MembershipPeriodEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
