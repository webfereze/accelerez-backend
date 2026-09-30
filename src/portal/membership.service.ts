import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EnrollmentEntity, MembershipPeriodEntity } from "@shared/entities";
import { MembershipStatus, PaymentMethod } from "@shared/enums/accelerez.enum";
import {
  PERIOD_DAYS,
  addDays,
  periodEnd,
  toDateString,
} from "@shared/utils/period";
import type { UpsertPeriodDto } from "./dto/portal.dto";

/**
 * The paid periods, and who says they were paid.
 *
 * Today this is a trainer pressing a button because cash changed hands or a
 * transfer landed. That is not a placeholder for a real payment system — it is
 * how most personal training in Romania is actually settled, and the automated
 * flow will write **these same rows** with `method = CARD` rather than
 * replacing them. Nothing downstream of this table knows how the money arrived.
 *
 * **A period is twenty-eight days from where it starts**, and where it starts
 * is the day after the last one ended — or today, if the client has been away.
 * That is the behaviour a coach expects: confirming on the 3rd when the
 * previous period ran to the 10th gives them the 11th, not a week they paid
 * for twice.
 *
 * Three things are enforced here rather than left to the caller:
 *
 * - **No overlap.** Two periods covering the same day would make "is this
 *   client paid up" depend on which row a query read first.
 * - **No gaps introduced by accident.** The default start continues from the
 *   last period rather than from today, so a trainer confirming a few days
 *   late does not silently shorten what the client gets.
 * - **`CARD` cannot be typed.** A card payment is something a processor
 *   confirms; allowing a person to select it would make the one method that is
 *   supposed to be evidence mean nothing.
 */
@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(MembershipPeriodEntity)
    private readonly periods: Repository<MembershipPeriodEntity>,
  ) {}

  /** Every period of an enrolment, newest first — the payment history. */
  list(enrollmentId: number): Promise<MembershipPeriodEntity[]> {
    return this.periods.find({
      where: { enrollmentId },
      order: { startsOn: "DESC", id: "DESC" },
    });
  }

  /**
   * Marks a month, creating the row if this is the first time it is touched.
   *
   * `amount` falls back to the trainer's list price at the moment of
   * validation and is then frozen: a price rise next spring must not rewrite
   * what somebody paid last autumn.
   *
   * `validatedBy` is stamped with whoever pressed the button — the trainer, or
   * an administrator acting for them. "The client says they paid and the month
   * is still closed" is the support question this product will get most, and
   * the answer should be a name and a timestamp rather than a guess.
   */
  async upsert(
    enrollment: EnrollmentEntity,
    dto: UpsertPeriodDto,
    validatedById: number,
  ): Promise<MembershipPeriodEntity> {
    if (dto.method === PaymentMethod.CARD) {
      throw new BadRequestException(
        "Plata cu cardul se confirmă automat, nu poate fi marcată manual.",
      );
    }

    const status = dto.status ?? MembershipStatus.PAID;
    const startsOn = dto.startsOn ?? (await this.nextStart(enrollment.id));
    const endsOn = periodEnd(startsOn);

    await this.assertNoOverlap(enrollment.id, startsOn, endsOn);

    const row = this.periods.create({
      enrollmentId: enrollment.id,
      startsOn,
      endsOn,
      status,
      // The trainer's list price at the moment of confirmation, frozen: a price
      // rise next spring must not rewrite what somebody paid last autumn.
      amount: dto.amount ?? enrollment.trainer?.monthlyPrice ?? null,
      currency: dto.currency ?? enrollment.trainer?.currency ?? "RON",
      method: dto.method ?? null,
      note: dto.note ?? null,
      validatedById,
      validatedAt: new Date(),
      // `paidAt` is when the money arrived; `validatedAt` is when somebody said
      // so. They differ by days in the normal case, and a report that conflates
      // them puts one period's cash in the next.
      paidAt: OPEN_STATUSES.includes(status)
        ? dto.paidAt
          ? new Date(dto.paidAt)
          : new Date()
        : null,
    });

    return this.periods.save(row);
  }

  /**
   * Where the next period starts.
   *
   * The day after the last one ends, unless that is in the past — a client who
   * stopped for three months starts today, not three months ago, which would
   * hand them a period that has already expired.
   */
  private async nextStart(enrollmentId: number): Promise<string> {
    const today = toDateString(new Date());

    const last = await this.periods
      .createQueryBuilder("p")
      .where("p.enrollmentId = :id", { id: enrollmentId })
      .orderBy("p.endsOn", "DESC")
      .getOne();

    if (!last?.endsOn) return today;

    const dayAfter = addDays(last.endsOn, 1);
    return dayAfter > today ? dayAfter : today;
  }

  /** Two periods covering the same day would make the paywall ambiguous. */
  private async assertNoOverlap(
    enrollmentId: number,
    startsOn: string,
    endsOn: string,
  ): Promise<void> {
    const clash = await this.periods
      .createQueryBuilder("p")
      .where("p.enrollmentId = :id", { id: enrollmentId })
      .andWhere("p.startsOn <= :endsOn", { endsOn })
      .andWhere("p.endsOn >= :startsOn", { startsOn })
      .getOne();

    if (clash) {
      throw new BadRequestException(
        `Perioada se suprapune cu una existentă (${clash.startsOn} – ${clash.endsOn}).`,
      );
    }
  }

  /**
   * Un-marks a period by deleting the row.
   *
   * Deleted rather than set back to `UNPAID`: "no row" and "a row that says
   * unpaid" both close the door, and keeping a row nobody ever paid makes the
   * history read as a list of failures.
   */
  async remove(enrollmentId: number, id: number): Promise<void> {
    const row = await this.periods.findOne({ where: { id, enrollmentId } });
    if (!row) throw new NotFoundException("Perioada nu există.");
    await this.periods.delete(id);
  }

  /**
   * What a trainer collected, by calendar month of the **payment**.
   *
   * Grouped by when the money arrived rather than by the period it bought,
   * because a period now straddles two months and a report that splits one
   * payment across them is a report nobody can reconcile against a bank
   * statement.
   *
   * `WAIVED` periods are counted separately and never added to the total: a
   * free trial and a collected period look identical on a calendar and must not
   * look identical in a number somebody plans around.
   */
  async revenueByMonth(trainerId: number, months = 12) {
    const rows = await this.periods
      .createQueryBuilder("p")
      .innerJoin("p.enrollment", "e")
      .where("e.trainerId = :trainerId", { trainerId })
      .orderBy("p.paidAt", "DESC")
      .getMany();

    const buckets = new Map<
      string,
      { year: number; month: number; paid: number; total: number; waived: number }
    >();

    for (const row of rows) {
      const when = row.paidAt ?? (row.startsOn ? new Date(row.startsOn) : null);
      if (!when) continue;

      const year = when.getFullYear();
      const month = when.getMonth() + 1;
      const key = `${year}-${month}`;
      const bucket = buckets.get(key) ?? { year, month, paid: 0, total: 0, waived: 0 };

      if (row.status === MembershipStatus.PAID) {
        bucket.paid += 1;
        bucket.total += row.amount ?? 0;
      } else if (row.status === MembershipStatus.WAIVED) {
        bucket.waived += 1;
      }

      buckets.set(key, bucket);
    }

    return [...buckets.values()].slice(0, months);
  }
}

/** Mirrors `AccessService` — the statuses that mean the month is settled. */
const OPEN_STATUSES = [MembershipStatus.PAID, MembershipStatus.WAIVED];
