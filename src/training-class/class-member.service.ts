import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  ClassMemberEntity,
  EnrollmentEntity,
  TrainingClassEntity,
} from "@shared/entities";
import { EnrollmentStatus } from "@shared/enums/accelerez.enum";
import { PageStatus } from "@shared/enums/page-status.enum";
import { nextOccurrence } from "@shared/utils/period";

/** A class as the client sees it in their account, with the next date on it. */
export type ClientClassView = {
  membershipId: number;
  joinedAt: Date;
  trainingClass: TrainingClassEntity;
  /** The next time it runs, when the class has a structured schedule. */
  nextAt: string | null;
  /**
   * Whether the coach has accepted this person as a client.
   *
   * **This is what carries the meeting link.** Computed rather than stored — a
   * flag would be wrong from the moment a coach accepts somebody until
   * something remembered to update it.
   */
  accepted: boolean;
  /** The class's coaches, so an unaccepted member knows who to ask. */
  trainerIds: number[];
};

/**
 * Who is in which class.
 *
 * **Joining is a registration, not a payment.** Nothing here takes money: a
 * class is paid at the door or monthly with the coach, exactly as the 1:1 side
 * is, and the product says so rather than implying a booking it cannot honour.
 * When card payment arrives this is where it attaches.
 *
 * **Anybody with an account may join; only an accepted client gets in.**
 * Registering is open, because turning somebody away at the door of a public
 * page teaches them nothing and loses them; what the registration does *not*
 * carry is the way in — the meeting link, and the coach's confirmation. That
 * arrives once the client is an accepted client of one of the class's trainers,
 * which is the admission model the whole product runs on: a coach decides who
 * they work with, and a group session is still their room.
 *
 * So a membership has two states, and neither is stored: `active` is whether
 * they joined, and **accepted** is computed from their enrolments every time it
 * is asked. Storing it would mean a flag that is wrong from the moment a coach
 * accepts somebody until something remembers to update it.
 *
 * Capacity is enforced here rather than trusted to the front end, because the
 * button that respects it is the one nobody clicks twice at the same second.
 */
@Injectable()
export class ClassMemberService {
  constructor(
    @InjectRepository(ClassMemberEntity)
    private readonly members: Repository<ClassMemberEntity>,
    @InjectRepository(TrainingClassEntity)
    private readonly classes: Repository<TrainingClassEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
  ) {}

  /** How many people are in a set of classes, in one query. */
  async countByClass(classIds: number[]): Promise<Record<number, number>> {
    if (!classIds.length) return {};

    const rows = await this.members
      .createQueryBuilder("m")
      .select("m.classId", "classId")
      .addSelect("COUNT(*)", "count")
      .where("m.classId IN (:...ids)", { ids: classIds })
      .andWhere("m.status = :status", { status: "active" })
      .groupBy("m.classId")
      .getRawMany<{ classId: number; count: string }>();

    return Object.fromEntries(rows.map((row) => [row.classId, Number(row.count)]));
  }

  // --- the client ----------------------------------------------------------

  async join(classId: number, clientId: number, note?: string): Promise<ClassMemberEntity> {
    const trainingClass = await this.classes.findOne({ where: { id: classId } });

    if (!trainingClass || trainingClass.status !== PageStatus.PUBLISHED) {
      throw new NotFoundException("Clasa nu există.");
    }

    const existing = await this.members.findOne({ where: { classId, clientId } });

    if (existing?.status === "active") {
      throw new ConflictException("Ești deja înscris la această clasă.");
    }

    // Counted at the moment of joining, not read from a cached number: two
    // people pressing the button at once is exactly when a stale count is
    // wrong, and it is the only moment the limit matters.
    if (trainingClass.capacity != null) {
      const taken = await this.members.count({ where: { classId, status: "active" } });
      if (taken >= trainingClass.capacity) {
        throw new ConflictException("Clasa este plină.");
      }
    }

    if (existing) {
      // Came back. The row is reused, so the history stays in one place.
      existing.status = "active";
      existing.note = note ?? existing.note;
      return this.members.save(existing);
    }

    return this.members.save(
      this.members.create({ classId, clientId, status: "active", note: note ?? null }),
    );
  }

  async leave(classId: number, clientId: number): Promise<void> {
    const row = await this.members.findOne({ where: { classId, clientId } });
    if (!row) throw new NotFoundException("Nu ești înscris la această clasă.");

    row.status = "left";
    await this.members.save(row);
  }

  /**
   * The classes this client is in, soonest first.
   *
   * Sorted by the next occurrence rather than by name: the question this screen
   * answers is "what do I have coming up", and a class with no structured
   * schedule sinks to the bottom rather than claiming a place in the order.
   */
  async listForClient(clientId: number): Promise<ClientClassView[]> {
    const rows = await this.members.find({
      where: { clientId, status: "active" },
      relations: ["trainingClass"],
    });

    // One query for every class at once: asking per row would be a query per
    // class on a screen somebody opens every day.
    const acceptedTrainerIds = await this.acceptedTrainersFor(
      clientId,
      [...new Set(rows.flatMap((row) => row.trainingClass?.trainerIds ?? []))],
    );
    const acceptedBy = new Set(acceptedTrainerIds);

    const views = rows
      .filter((row) => row.trainingClass)
      .map((row) => {
        const next = nextOccurrence(
          row.trainingClass.weekdays,
          row.trainingClass.startTime,
        );

        const trainerIds = row.trainingClass.trainerIds ?? [];
        const accepted = trainerIds.some((id) => acceptedBy.has(id));

        return {
          membershipId: row.id,
          joinedAt: row.joinedAt,
          // **The link is stripped for anybody the coach has not accepted.**
          // Withholding it in the interface alone would be a link sitting in
          // the JSON of a page anybody can open the developer tools on.
          trainingClass: accepted
            ? row.trainingClass
            : { ...row.trainingClass, meetingUrl: null },
          nextAt: next ? next.toISOString() : null,
          accepted,
          trainerIds,
        };
      });

    return views.sort((a, b) => {
      if (a.nextAt && b.nextAt) return a.nextAt.localeCompare(b.nextAt);
      if (a.nextAt) return -1;
      if (b.nextAt) return 1;
      return 0;
    });
  }

  /**
   * Which of this class's coaches this client is an accepted client of.
   *
   * The join button needs to say *why* it cannot be pressed, and "ask this
   * coach first" is only useful if it names one. Returns the trainer ids the
   * client is already accepted by, so an empty array means "none of them".
   */
  async acceptedTrainersFor(clientId: number, trainerIds: number[]): Promise<number[]> {
    if (!trainerIds.length) return [];

    const rows = await this.enrollments.find({
      where: { clientId, trainerId: In(trainerIds), status: EnrollmentStatus.ACTIVE },
      select: ["trainerId"],
    });

    return rows.map((row) => row.trainerId);
  }

  /** Which of these classes this client is already in — for the join button. */
  async membershipsOf(clientId: number, classIds: number[]): Promise<number[]> {
    if (!classIds.length) return [];

    const rows = await this.members.find({
      where: { clientId, classId: In(classIds), status: "active" },
      select: ["classId"],
    });

    return rows.map((row) => row.classId);
  }

  // --- the trainer ---------------------------------------------------------

  /**
   * Everybody in one class, newest first, each marked with whether this coach
   * has accepted them as a client.
   *
   * The distinction is the whole point of the screen: somebody who registered
   * but was never accepted has no link and no way in, and the coach is the only
   * person who can change that.
   */
  async list(classId: number): Promise<Array<ClassMemberEntity & { accepted: boolean }>> {
    const trainingClass = await this.classes.findOne({ where: { id: classId } });

    const rows = await this.members.find({
      where: { classId },
      relations: ["client"],
      order: { status: "ASC", joinedAt: "DESC" },
    });

    const trainerIds = trainingClass?.trainerIds ?? [];
    if (!trainerIds.length || !rows.length) {
      return rows.map((row) => ({ ...row, accepted: false }));
    }

    // One query for the page, not one per member.
    const accepted = await this.enrollments.find({
      where: {
        clientId: In(rows.map((row) => row.clientId)),
        trainerId: In(trainerIds),
        status: EnrollmentStatus.ACTIVE,
      },
      select: ["clientId"],
    });

    const acceptedClients = new Set(accepted.map((row) => row.clientId));

    return rows.map((row) => ({ ...row, accepted: acceptedClients.has(row.clientId) }));
  }

  /**
   * A coach taking somebody off their class.
   *
   * Marked `left`, never deleted — see `ClassMemberEntity`. The row is the only
   * record that this person was ever in the room.
   */
  async removeMember(classId: number, memberId: number): Promise<void> {
    const row = await this.members.findOne({ where: { id: memberId, classId } });
    if (!row) throw new NotFoundException("Persoana nu este înscrisă la această clasă.");

    row.status = "left";
    await this.members.save(row);
  }

  /** The coach's private note about one member. Never returned to the client. */
  async noteMember(classId: number, memberId: number, note: string) {
    const row = await this.members.findOne({ where: { id: memberId, classId } });
    if (!row) throw new NotFoundException("Persoana nu este înscrisă la această clasă.");

    row.trainerNote = note;
    return this.members.save(row);
  }
}
