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
import { MembershipStatus, PaymentMethod } from "@shared/enums/accelerez.enum";
import { EnrollmentEntity } from "./enrollment.entity";
import { UserEntity } from "./user.entity";
import { decimalToNumber } from "@shared/utils/decimal";

/**
 * One paid period of one enrolment: twenty-eight days from the day it starts.
 *
 * **This row is the access control.** The client's area asks exactly one
 * question — is there a period covering today whose status opens the door — and
 * the whole paywall is that answer.
 *
 * **A range, not a calendar month.** It began as `year` + `month` and that was
 * wrong: a client confirmed on the 28th got three days for a full price, which
 * is the kind of thing a coach has to apologise for. Four weeks from the
 * confirmation is also how training is planned. `PERIOD_DAYS` is the length and
 * lives in one place — see `shared/utils/period.ts`.
 *
 * `endsOn` is **inclusive** and stored rather than computed, because it is what
 * every query filters on and a derived value in a `WHERE` clause is an index
 * nobody can use.
 *
 * Payment is recorded by hand today — a trainer marks it paid because cash
 * changed hands. When a payment processor arrives it writes exactly these rows
 * with `method = CARD`, so nothing downstream of this table changes.
 */
@Entity({ name: "membership_periods" })
@Index(["enrollmentId", "startsOn"])
@Index(["status", "endsOn"])
export class MembershipPeriodEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  enrollmentId: number;

  @ManyToOne(() => EnrollmentEntity, (enrollment) => enrollment.periods, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "enrollmentId" })
  enrollment: EnrollmentEntity;

  /** `YYYY-MM-DD`, the first day covered. */
  @Column({ type: "date", nullable: true })
  startsOn: string;

  /** `YYYY-MM-DD`, the last day covered — inclusive. See the class note. */
  @Column({ type: "date", nullable: true })
  endsOn: string;

  @Column({
    type: "enum",
    enum: MembershipStatus,
    default: MembershipStatus.UNPAID,
  })
  status: MembershipStatus;

  /**
   * What was actually charged, which is not always the trainer's list price —
   * a discount, a shorter month, a returning client. Copied at validation time
   * so a later price change does not rewrite history.
   */
  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalToNumber,
  })
  amount: number | null;

  @Column({ type: "char", length: 3, default: "RON" })
  currency: string;

  @Column({ type: "enum", enum: PaymentMethod, nullable: true })
  method: PaymentMethod | null;

  /** When the money arrived, as the trainer states it. */
  @Column({ type: "datetime", nullable: true })
  paidAt: Date | null;

  /**
   * Who marked it paid — the trainer, or an administrator acting for them.
   *
   * Kept because "the client says they paid and the month is still closed" is
   * the support question this product will get most, and the answer is a name
   * and a timestamp rather than a guess.
   */
  @Column({ nullable: true })
  validatedById: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "validatedById" })
  validatedBy: UserEntity | null;

  @Column({ type: "datetime", nullable: true })
  validatedAt: Date | null;

  @Column({ type: "text", nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
