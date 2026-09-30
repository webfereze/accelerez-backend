import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EnrollmentEntity, MembershipPeriodEntity } from "@shared/entities";
import { EnrollmentStatus, MembershipStatus } from "@shared/enums/accelerez.enum";
import {
  PERIOD_DAYS,
  daysBetween,
  toDateString,
} from "@shared/utils/period";

/** The answer every client screen starts from. */
export type AccessState = {
  /** Whether the training material may be shown at all. */
  open: boolean;
  /** Why not, when it is closed — the front end turns this into a sentence. */
  reason: "not_active" | "unpaid" | null;

  /** The period covering today, when there is one. `YYYY-MM-DD`. */
  startsOn: string | null;
  /** Its last day, inclusive. Null when nothing covers today. */
  endsOn: string | null;

  /** The status of that period, or null when no period covers today. */
  status: MembershipStatus | null;
  amount: number | null;
  currency: string;
  paidAt: Date | null;

  /**
   * How long the period runs and how much of it is left.
   *
   * Computed here rather than in each screen because a client's dashboard,
   * their enrolment page and the trainer's view of them all print the same
   * number, and three subtractions of `new Date()` in three components is how
   * they end up disagreeing by a day around midnight.
   */
  daysTotal: number;
  /** Today counts as active: on the last day this is 1, not 0. */
  daysLeft: number;

  /** When the last period ended, if it has. Lets a closed screen say when. */
  lastEndedOn: string | null;
};

/**
 * The paywall, in one place.
 *
 * A client sees their trainer's videos, sheets and diets when **two** things
 * hold: the enrolment is `ACTIVE`, and a period covering today has a status
 * that opens the door. Everything else in the product is presentation; this is
 * the business rule.
 *
 * It lives in a service of its own, and every read of trainer material goes
 * through it, because the alternative — each controller checking for itself —
 * means the tenth screen is the one that forgets and quietly serves a paying
 * feature to someone who stopped paying in March.
 *
 * **Time is read once, here.** Today is asked of the clock in a single place,
 * so a request that straddles midnight cannot see two different answers in two
 * queries.
 */
@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(MembershipPeriodEntity)
    private readonly periods: Repository<MembershipPeriodEntity>,
  ) {}

  /** Today, as the product counts days. */
  today(at: Date = new Date()): string {
    return toDateString(at);
  }

  /**
   * What this enrolment may see right now.
   *
   * Returns a state rather than a boolean: every screen that asks also has to
   * *say* something — until when, how much, paid when — and deriving that from
   * a boolean means querying the same row twice.
   */
  async stateFor(enrollment: EnrollmentEntity, at: Date = new Date()): Promise<AccessState> {
    const today = this.today(at);

    /**
     * The period covering today, whichever it is.
     *
     * Ordered by `startsOn` descending so that if two ever overlap — which the
     * service refuses to create, but a hand-edited database could — the most
     * recent one wins rather than whichever the storage engine returned first.
     */
    const current = await this.periods
      .createQueryBuilder("p")
      .where("p.enrollmentId = :id", { id: enrollment.id })
      .andWhere("p.startsOn <= :today", { today })
      .andWhere("p.endsOn >= :today", { today })
      .orderBy("p.startsOn", "DESC")
      .getOne();

    /** The most recent period that has already finished — for the copy. */
    const previous = current
      ? null
      : await this.periods
          .createQueryBuilder("p")
          .where("p.enrollmentId = :id", { id: enrollment.id })
          .andWhere("p.endsOn < :today", { today })
          .orderBy("p.endsOn", "DESC")
          .getOne();

    const active = enrollment.status === EnrollmentStatus.ACTIVE;
    const paid = current ? OPEN_STATUSES.includes(current.status) : false;

    return {
      open: active && paid,
      reason: !active ? "not_active" : paid ? null : "unpaid",
      startsOn: current?.startsOn ?? null,
      endsOn: current?.endsOn ?? null,
      status: current?.status ?? null,
      amount: current?.amount ?? null,
      currency: current?.currency ?? "RON",
      paidAt: current?.paidAt ?? null,
      daysTotal: current ? daysBetween(current.startsOn, current.endsOn) : PERIOD_DAYS,
      daysLeft: current ? Math.max(daysBetween(today, current.endsOn), 0) : 0,
      lastEndedOn: previous?.endsOn ?? null,
    };
  }

  /**
   * The same check, as a gate. Throws rather than returning, for the handlers
   * whose whole job is to refuse.
   *
   * The message names the trainer on purpose: "nu ai acces" sends a client to
   * support, "nu ai o perioadă confirmată de antrenor" sends them to their
   * trainer — who is the only person who can fix it.
   */
  async assertOpen(enrollment: EnrollmentEntity): Promise<AccessState> {
    const state = await this.stateFor(enrollment);
    if (state.open) return state;

    throw new ForbiddenException(
      state.reason === "not_active"
        ? "Înscrierea nu este activă."
        : "Nu ai o perioadă activă confirmată de antrenor.",
    );
  }
}

/**
 * The two statuses that open the door.
 *
 * `WAIVED` opens it and is still not `PAID` — a free period and a collected one
 * must not add up to the same figure in a report. See `MembershipStatus`.
 */
const OPEN_STATUSES = [MembershipStatus.PAID, MembershipStatus.WAIVED];
