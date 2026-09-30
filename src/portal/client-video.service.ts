import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  ClientVideoEntity,
  EnrollmentEntity,
  VideoCommentEntity,
} from "@shared/entities";
import { ClientVideoStatus, EnrollmentStatus } from "@shared/enums/accelerez.enum";
import { pageParams, type Paged } from "@shared/utils/paged";
import { AccessService } from "./access.service";
import type {
  CreateClientVideoDto,
  PortalQueryDto,
  ReviewClientVideoDto,
} from "./dto/portal.dto";

/**
 * The videos clients send back.
 *
 * This is the half of online coaching that a spreadsheet cannot do: form is
 * something a coach has to see. A client films a set, the trainer answers, and
 * the answer is attached to the video rather than lost in a chat.
 *
 * **Uploading is gated by the same paywall as reading.** A client whose month
 * is not settled cannot post — otherwise the trainer owes work to someone who
 * has not paid for it, which is the quiet way a subscription product stops
 * being one.
 *
 * Deleting is the client's, not the trainer's: they filmed it, it is of them,
 * and a coach who could erase a recording could erase the evidence of what they
 * were asked. A trainer archives instead.
 */
@Injectable()
export class ClientVideoService {
  constructor(
    @InjectRepository(ClientVideoEntity)
    private readonly videos: Repository<ClientVideoEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
    @InjectRepository(VideoCommentEntity)
    private readonly comments: Repository<VideoCommentEntity>,
    private readonly access: AccessService,
  ) {}

  // --- client --------------------------------------------------------------

  async listForClient(enrollment: EnrollmentEntity): Promise<ClientVideoEntity[]> {
    return this.videos.find({
      where: { enrollmentId: enrollment.id },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Either an uploaded file or a link, never neither.
   *
   * The choice is real rather than a fallback: a phone recording of a squat is
   * routinely 400 MB, and a client who would rather paste an unlisted YouTube
   * link should not be forced through an upload that will time out on their
   * connection.
   */
  async create(
    enrollment: EnrollmentEntity,
    dto: CreateClientVideoDto,
  ): Promise<ClientVideoEntity> {
    await this.access.assertOpen(enrollment);

    if (!dto.filePath && !dto.url) {
      throw new BadRequestException("Încarcă un fișier sau adaugă un link.");
    }

    return this.videos.save(
      this.videos.create({
        enrollmentId: enrollment.id,
        title: dto.title.trim(),
        note: dto.note ?? null,
        filePath: dto.filePath ?? null,
        url: dto.url ?? null,
        fileSize: dto.fileSize ?? null,
        mimeType: dto.mimeType ?? null,
        status: ClientVideoStatus.PENDING,
      }),
    );
  }

  /** Their own recording, theirs to withdraw — see the class note. */
  async removeAsClient(enrollment: EnrollmentEntity, id: number): Promise<void> {
    const row = await this.videos.findOne({ where: { id, enrollmentId: enrollment.id } });
    if (!row) throw new NotFoundException("Videoclipul nu există.");
    await this.videos.delete(id);
  }

  // --- the conversation on one recording -----------------------------------

  /**
   * The remarks on one video, oldest first.
   *
   * A row written before comments existed carries its answer in the video's own
   * `feedback` column; it is returned here as a synthetic first remark so the
   * thread reads whole rather than starting at whatever was said after the
   * change. See `VideoCommentEntity`.
   */
  async comments_(video: ClientVideoEntity): Promise<
    Array<{ id: number; authorId: number | null; body: string; createdAt: Date; author?: unknown }>
  > {
    const rows = await this.comments.find({
      where: { clientVideoId: video.id },
      relations: ["author"],
      order: { createdAt: "ASC", id: "ASC" },
    });

    if (!video.feedback) return rows;

    return [
      {
        // Negative, so it cannot collide with a real row's id and a client
        // cannot address it as one.
        id: -video.id,
        authorId: video.reviewedById ?? null,
        body: video.feedback,
        createdAt: video.reviewedAt ?? video.createdAt,
      },
      ...rows,
    ];
  }

  /**
   * Adds a remark, from either side.
   *
   * **A trainer's remark is what marks the video answered.** A status somebody
   * has to remember to set separately is a status that stays `PENDING` on a
   * video they have already replied to, and the trainer's dashboard then counts
   * work that is done.
   */
  async comment(
    video: ClientVideoEntity,
    authorId: number,
    body: string,
    fromTrainer: boolean,
  ) {
    const saved = await this.comments.save(
      this.comments.create({ clientVideoId: video.id, authorId, body: body.trim() }),
    );

    if (fromTrainer && video.status === ClientVideoStatus.PENDING) {
      await this.videos.update(video.id, {
        status: ClientVideoStatus.REVIEWED,
        reviewedAt: new Date(),
        reviewedById: authorId,
      });
    }

    return this.comments.findOne({ where: { id: saved.id }, relations: ["author"] });
  }

  /** One video of this enrolment, for the client's own screen. */
  async findForEnrollment(enrollmentId: number, id: number): Promise<ClientVideoEntity> {
    const row = await this.videos.findOne({ where: { id, enrollmentId } });
    if (!row) throw new NotFoundException("Videoclipul nu există.");
    return row;
  }

  /** Opening a recording is seeing whatever was said on it. */
  async markSeenByClient(video: ClientVideoEntity): Promise<void> {
    await this.videos.update(video.id, { clientSeenAt: new Date() });
  }

  /**
   * How many recordings carry a reply the client has not opened yet.
   *
   * Counted from the comments rather than from the status: a trainer who adds a
   * second remark to a video already marked `REVIEWED` has said something new,
   * and a count keyed on the status would miss it entirely.
   */
  async unreadForClient(enrollmentId: number, clientId: number): Promise<number> {
    const rows = await this.videos.find({ where: { enrollmentId } });
    if (!rows.length) return 0;

    const latest = await this.comments
      .createQueryBuilder("c")
      .select("c.clientVideoId", "videoId")
      .addSelect("MAX(c.createdAt)", "at")
      .where("c.clientVideoId IN (:...ids)", { ids: rows.map((r) => r.id) })
      .andWhere("c.authorId != :clientId", { clientId })
      .groupBy("c.clientVideoId")
      .getRawMany<{ videoId: number; at: Date }>();

    const byVideo = new Map(latest.map((row) => [Number(row.videoId), new Date(row.at)]));

    return rows.filter((video) => {
      // The legacy single field counts as a reply too — see `VideoCommentEntity`.
      const answeredAt = byVideo.get(video.id) ?? (video.feedback ? video.reviewedAt : null);
      if (!answeredAt) return false;
      return !video.clientSeenAt || video.clientSeenAt < answeredAt;
    }).length;
  }

  /** One video of one of this trainer's clients. Public wrapper for `findOwned`. */
  findForTrainer(trainerId: number, id: number): Promise<ClientVideoEntity> {
    return this.findOwned(trainerId, id);
  }

  // --- trainer -------------------------------------------------------------

  /**
   * A trainer's inbox, across every one of their clients.
   *
   * Defaults to `PENDING` on purpose: the list exists to answer "what do I owe
   * an answer to", and a reverse-chronological wall of everything ever sent
   * answers a question nobody asked.
   */
  async listForTrainer(
    trainerId: number,
    query: PortalQueryDto = {},
  ): Promise<Paged<ClientVideoEntity>> {
    const enrollmentIds = (
      await this.enrollments.find({
        where: { trainerId },
        select: ["id"],
      })
    ).map((row) => row.id);

    if (!enrollmentIds.length) {
      const { page, perPage } = pageParams(query);
      return { rows: [], total: 0, page, perPage };
    }

    const qb = this.videos
      .createQueryBuilder("v")
      .innerJoinAndSelect("v.enrollment", "e")
      .innerJoinAndSelect("e.client", "client")
      .where("v.enrollmentId IN (:...ids)", { ids: enrollmentIds })
      .orderBy("v.createdAt", "DESC");

    if (query.videoStatus) {
      qb.andWhere("v.status = :status", { status: query.videoStatus });
    }
    if (query.enrollmentId) {
      qb.andWhere("v.enrollmentId = :enrollmentId", { enrollmentId: query.enrollmentId });
    }

    const { page, perPage, skip, take } = pageParams(query);
    const [rows, total] = await qb.skip(skip).take(take).getManyAndCount();

    return { rows, total, page, perPage };
  }

  /**
   * The trainer's answer. Writing feedback is what marks it reviewed — a status
   * a coach has to remember to set separately is a status that stays `PENDING`
   * on a video they already answered.
   */
  async review(
    trainerId: number,
    id: number,
    dto: ReviewClientVideoDto,
    reviewerId: number,
  ): Promise<ClientVideoEntity> {
    const row = await this.findOwned(trainerId, id);

    row.feedback = dto.feedback;
    row.status = dto.status ?? ClientVideoStatus.REVIEWED;
    row.reviewedAt = new Date();
    row.reviewedById = reviewerId;

    return this.videos.save(row);
  }

  /** Out of the inbox, still on the client's shelf. */
  async archive(trainerId: number, id: number): Promise<ClientVideoEntity> {
    const row = await this.findOwned(trainerId, id);
    row.status = ClientVideoStatus.ARCHIVED;
    return this.videos.save(row);
  }

  /**
   * Videos awaiting an answer, per enrolment, in one query.
   *
   * The client list shows a dot per row; asking per row would be one query per
   * client, which is the classic list that gets slower the more successful the
   * coach becomes.
   */
  async pendingByEnrollment(enrollmentIds: number[]): Promise<Record<number, number>> {
    if (!enrollmentIds.length) return {};

    const rows = await this.videos
      .createQueryBuilder("v")
      .select("v.enrollmentId", "enrollmentId")
      .addSelect("COUNT(*)", "count")
      .where("v.enrollmentId IN (:...ids)", { ids: enrollmentIds })
      .andWhere("v.status = :status", { status: ClientVideoStatus.PENDING })
      .groupBy("v.enrollmentId")
      .getRawMany<{ enrollmentId: number; count: string }>();

    return Object.fromEntries(rows.map((row) => [row.enrollmentId, Number(row.count)]));
  }

  /** How many answers a trainer owes — the badge on the dashboard. */
  async pendingCount(trainerId: number): Promise<number> {
    const ids = (
      await this.enrollments.find({
        where: { trainerId, status: EnrollmentStatus.ACTIVE },
        select: ["id"],
      })
    ).map((row) => row.id);

    if (!ids.length) return 0;

    return this.videos.count({
      where: { enrollmentId: In(ids), status: ClientVideoStatus.PENDING },
    });
  }

  /**
   * One video of one of this trainer's clients.
   *
   * The ownership hop through `enrollment` is the point: without it, a video id
   * in a URL is enough for any trainer to read any client's recording.
   */
  private async findOwned(trainerId: number, id: number): Promise<ClientVideoEntity> {
    const row = await this.videos.findOne({
      where: { id },
      relations: ["enrollment"],
    });

    if (!row || row.enrollment?.trainerId !== trainerId) {
      throw new NotFoundException("Videoclipul nu există.");
    }

    return row;
  }
}
