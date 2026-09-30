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
  ClientVideoEntity,
  EnrollmentEntity,
  TrainerEntity,
  UserEntity,
} from "@shared/entities";
import {
  ClientVideoStatus,
  EnrollmentStatus,
} from "@shared/enums/accelerez.enum";
import { PageStatus } from "@shared/enums/page-status.enum";
import { pageParams, type Paged } from "@shared/utils/paged";
import { AccessService, type AccessState } from "./access.service";
import { MessageService } from "./message.service";
import type { EnrollDto, PortalQueryDto, UpdateEnrollmentDto } from "./dto/portal.dto";

/** An enrolment as the client sees it — no trainer notes. */
export type ClientEnrollmentView = {
  id: number;
  status: EnrollmentStatus;
  goal: string | null;
  acceptedAt: Date | null;
  createdAt: Date;
  trainer: {
    id: number;
    displayName: string;
    photo: string | null;
    slug: unknown;
    headline: unknown;
    city: string | null;
    monthlyPrice: number | null;
    currency: string;
  };
  access: AccessState;
  /** Messages from the trainer this client has not read — the dot on the card. */
  unreadMessages: number;
};

/**
 * Who trains with whom, and who decides.
 *
 * Two rules run through everything here:
 *
 * - **The trainer accepts, the client asks.** A sign-up creates a `PENDING`
 *   row and nothing else — no month is opened, no material is visible. Billing
 *   somebody a coach has not agreed to take would be the worst possible first
 *   impression, and an inbox of requests is a feature, not an inconvenience.
 *
 * - **A pair has exactly one enrolment, ever.** Signing up again after leaving
 *   reactivates the row rather than adding a second, so a trainer's client list
 *   never shows the same person twice and the payment history stays in one
 *   place. See the unique index on the entity.
 */
@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
    @InjectRepository(TrainerEntity)
    private readonly trainers: Repository<TrainerEntity>,
    @InjectRepository(ClientVideoEntity)
    private readonly videos: Repository<ClientVideoEntity>,
    private readonly access: AccessService,
    private readonly messages: MessageService,
  ) {}

  // --- client --------------------------------------------------------------

  /**
   * A client asks to train with someone.
   *
   * Refused when the trainer is not published or has closed their list: the
   * button is hidden in both cases, so a request that gets here came from a
   * stale page or a crafted call, and accepting it would put a row in a
   * trainer's inbox they were promised they would not get.
   */
  async enroll(clientId: number, dto: EnrollDto): Promise<EnrollmentEntity> {
    const trainer = await this.trainers.findOne({ where: { id: dto.trainerId } });
    if (!trainer || trainer.status !== PageStatus.PUBLISHED) {
      throw new NotFoundException("Antrenorul nu există.");
    }
    if (!trainer.isAcceptingClients) {
      throw new ConflictException("Antrenorul nu mai preia cursanți momentan.");
    }
    if (trainer.userId === clientId) {
      throw new BadRequestException("Nu te poți înscrie la propriul profil.");
    }

    const existing = await this.enrollments.findOne({
      where: { clientId, trainerId: trainer.id },
    });

    if (existing) {
      if (LIVE_STATUSES.includes(existing.status)) {
        throw new ConflictException("Ești deja înscris la acest antrenor.");
      }

      // Came back. The row is reused — see the class note.
      existing.status = EnrollmentStatus.PENDING;
      existing.goal = dto.goal;
      existing.acceptedAt = null;
      existing.endedAt = null;
      return this.enrollments.save(existing);
    }

    return this.enrollments.save(
      this.enrollments.create({
        clientId,
        trainerId: trainer.id,
        goal: dto.goal,
        status: EnrollmentStatus.PENDING,
      }),
    );
  }

  /**
   * Everything a client is enrolled in, with the access state of each.
   *
   * The access state is resolved here rather than by the caller because every
   * client screen needs it and each would otherwise ask the clock and the
   * period table for itself — see `AccessService`.
   */
  async listForClient(clientId: number): Promise<ClientEnrollmentView[]> {
    const rows = await this.enrollments.find({
      where: { clientId },
      relations: ["trainer"],
      order: { createdAt: "DESC" },
    });

    return Promise.all(rows.map((row) => this.toClientView(row)));
  }

  /**
   * One enrolment of this client's, addressed by the **trainer's slug** or by
   * id, or 404. Never another client's.
   *
   * Both forms are accepted because the addresses moved from ids to slugs and
   * a link somebody bookmarked or sent to support should not break. The id path
   * is still filtered by `clientId`, so it hands nobody anything they could not
   * already see.
   */
  async findForClient(clientId: number, handle: string | number): Promise<EnrollmentEntity> {
    const asId = Number(handle);

    if (Number.isInteger(asId) && String(asId) === String(handle)) {
      const byId = await this.enrollments.findOne({
        where: { id: asId, clientId },
        relations: ["trainer"],
      });
      if (byId) return byId;
    }

    // By slug: the client's own enrolments, matched on the trainer's slug in
    // whichever language it was written — `slug` is a `Translated` column, so
    // this cannot be a SQL comparison.
    const rows = await this.enrollments.find({
      where: { clientId },
      relations: ["trainer"],
    });

    const found = rows.find((row) =>
      Object.values((row.trainer?.slug ?? {}) as Record<string, string>).includes(
        String(handle),
      ),
    );

    if (!found) throw new NotFoundException("Înscrierea nu există.");
    return found;
  }

  async viewForClient(
    clientId: number,
    handle: string | number,
  ): Promise<ClientEnrollmentView> {
    return this.toClientView(await this.findForClient(clientId, handle));
  }

  // --- trainer -------------------------------------------------------------

  /**
   * A trainer's client list.
   *
   * Includes the current month's state per row, which is the column a coach
   * actually reads: the list exists to answer "who has not paid yet".
   */
  async listForTrainer(
    trainerId: number,
    query: PortalQueryDto = {},
  ): Promise<Paged<EnrollmentEntity & { access: AccessState }>> {
    const qb = this.enrollments
      .createQueryBuilder("e")
      .leftJoinAndSelect("e.client", "client")
      .where("e.trainerId = :trainerId", { trainerId })
      .orderBy("e.status", "ASC")
      .addOrderBy("e.createdAt", "DESC");

    if (query.status) qb.andWhere("e.status = :status", { status: query.status });

    const term = query.search?.trim();
    if (term) {
      qb.andWhere(
        "(client.firstName LIKE :term OR client.lastName LIKE :term OR client.email LIKE :term)",
        { term: `%${term}%` },
      );
    }

    const { page, perPage, skip, take } = pageParams(query);
    const [rows, total] = await qb.skip(skip).take(take).getManyAndCount();

    const withAccess = await Promise.all(
      rows.map(async (row) => ({ ...row, access: await this.access.stateFor(row) })),
    );

    return { rows: withAccess, total, page, perPage };
  }

  /**
   * One of this trainer's enrolments, addressed by the **client's slug** or by
   * id, or 404. Never another trainer's — see `findForClient` for why both
   * forms are accepted.
   */
  async findForTrainer(trainerId: number, handle: string | number): Promise<EnrollmentEntity> {
    const asId = Number(handle);

    if (Number.isInteger(asId) && String(asId) === String(handle)) {
      const byId = await this.enrollments.findOne({
        where: { id: asId, trainerId },
        relations: ["client", "trainer"],
      });
      if (byId) return byId;
    }

    const bySlug = await this.enrollments
      .createQueryBuilder("e")
      .leftJoinAndSelect("e.client", "client")
      .leftJoinAndSelect("e.trainer", "trainer")
      .where("e.trainerId = :trainerId", { trainerId })
      .andWhere("client.slug = :slug", { slug: String(handle) })
      .getOne();

    if (!bySlug) throw new NotFoundException("Înscrierea nu există.");
    return bySlug;
  }

  /**
   * Accept, decline, pause, end — and the trainer's private note.
   *
   * `acceptedAt` and `endedAt` are stamped from the transition rather than sent
   * by the client: a date the caller supplies is a date the caller can get
   * wrong, and these two are what every "since when" on the screen reads.
   */
  async updateAsTrainer(
    trainerId: number,
    handle: string | number,
    dto: UpdateEnrollmentDto,
  ): Promise<EnrollmentEntity> {
    const row = await this.findForTrainer(trainerId, handle);

    if (dto.status && dto.status !== row.status) {
      assertTransition(row.status, dto.status);
      row.status = dto.status;

      if (dto.status === EnrollmentStatus.ACTIVE && !row.acceptedAt) {
        row.acceptedAt = new Date();
      }
      if (dto.status === EnrollmentStatus.ENDED || dto.status === EnrollmentStatus.DECLINED) {
        row.endedAt = new Date();
      }
    }

    if (dto.trainerNote !== undefined) row.trainerNote = dto.trainerNote;

    return this.enrollments.save(row);
  }

  /**
   * The numbers on a trainer's dashboard.
   *
   * Four counts in one call: the dashboard renders them together and four
   * round trips would make it the slowest screen in the product for no reason.
   */
  async trainerSummary(trainerId: number) {
    const [active, pending, paused] = await Promise.all([
      this.enrollments.count({ where: { trainerId, status: EnrollmentStatus.ACTIVE } }),
      this.enrollments.count({ where: { trainerId, status: EnrollmentStatus.PENDING } }),
      this.enrollments.count({ where: { trainerId, status: EnrollmentStatus.PAUSED } }),
    ]);

    const activeRows = await this.enrollments.find({
      where: { trainerId, status: EnrollmentStatus.ACTIVE },
      relations: ["client"],
    });

    // Who has not paid this month — the one number a coach opens the app for.
    const states = await Promise.all(
      activeRows.map(async (row) => ({ row, access: await this.access.stateFor(row) })),
    );
    const unpaid = states.filter((s) => !s.access.open);

    const pendingVideos = activeRows.length
      ? await this.videos.count({
          where: {
            enrollmentId: In(activeRows.map((r) => r.id)),
            status: ClientVideoStatus.PENDING,
          },
        })
      : 0;

    return {
      active,
      pending,
      paused,
      /** Not "this month" any more — clients whose period has run out. */
      unpaidThisMonth: unpaid.length,
      pendingVideos,
      /** Named, not just counted — the dashboard lists them to chase. */
      unpaidClients: unpaid.map(({ row, access }) => ({
        enrollmentId: row.id,
        /** The handle the dashboard links with — never the id. */
        slug: row.client?.slug ?? null,
        name: fullName(row.client),
        email: row.client?.email,
        /** When their last confirmed period ran out, when there was one. */
        lastEndedOn: access.lastEndedOn,
        status: access.status,
      })),
    };
  }

  // --- admin ---------------------------------------------------------------

  /** Every enrolment on the platform, for oversight. */
  async listAll(query: PortalQueryDto = {}): Promise<Paged<EnrollmentEntity>> {
    const qb = this.enrollments
      .createQueryBuilder("e")
      .leftJoinAndSelect("e.client", "client")
      .leftJoinAndSelect("e.trainer", "trainer")
      .orderBy("e.createdAt", "DESC");

    if (query.status) qb.andWhere("e.status = :status", { status: query.status });
    if (query.trainerId) qb.andWhere("e.trainerId = :trainerId", { trainerId: query.trainerId });

    const term = query.search?.trim();
    if (term) {
      qb.andWhere(
        "(client.firstName LIKE :term OR client.lastName LIKE :term OR client.email LIKE :term OR trainer.displayName LIKE :term)",
        { term: `%${term}%` },
      );
    }

    const { page, perPage, skip, take } = pageParams(query);
    const [rows, total] = await qb.skip(skip).take(take).getManyAndCount();

    return { rows, total, page, perPage };
  }

  /** By id, with no ownership filter. `/admin` only — see `TrainerGuard`. */
  async findAny(id: number): Promise<EnrollmentEntity> {
    const row = await this.enrollments.findOne({
      where: { id },
      relations: ["client", "trainer"],
    });
    if (!row) throw new NotFoundException("Înscrierea nu există.");
    return row;
  }

  // --- internals -----------------------------------------------------------

  private async toClientView(row: EnrollmentEntity): Promise<ClientEnrollmentView> {
    return {
      id: row.id,
      status: row.status,
      goal: row.goal,
      acceptedAt: row.acceptedAt,
      createdAt: row.createdAt,
      // Deliberately field by field: spreading the entity is how `trainerNote`
      // reaches the person it was written about.
      trainer: {
        id: row.trainer.id,
        displayName: row.trainer.displayName,
        photo: row.trainer.photo,
        slug: row.trainer.slug,
        headline: row.trainer.headline,
        city: row.trainer.city,
        monthlyPrice: row.trainer.monthlyPrice,
        currency: row.trainer.currency,
      },
      access: await this.access.stateFor(row),
      unreadMessages: await this.messages.unreadFor(row.id, row.clientId),
    };
  }
}

/** Statuses that mean "this pair is currently working together, or about to". */
const LIVE_STATUSES = [
  EnrollmentStatus.PENDING,
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.PAUSED,
];

/**
 * Which moves are legal.
 *
 * Declared rather than implied: without it a declined request can be flipped
 * straight to active months later, and a client who was told no gets billed.
 */
const TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  [EnrollmentStatus.PENDING]: [EnrollmentStatus.ACTIVE, EnrollmentStatus.DECLINED],
  [EnrollmentStatus.ACTIVE]: [EnrollmentStatus.PAUSED, EnrollmentStatus.ENDED],
  [EnrollmentStatus.PAUSED]: [EnrollmentStatus.ACTIVE, EnrollmentStatus.ENDED],
  [EnrollmentStatus.ENDED]: [EnrollmentStatus.ACTIVE],
  [EnrollmentStatus.DECLINED]: [],
};

function assertTransition(from: EnrollmentStatus, to: EnrollmentStatus): void {
  if (!TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException(`Tranziția ${from} → ${to} nu este permisă.`);
  }
}

function fullName(user?: UserEntity | null): string {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}
