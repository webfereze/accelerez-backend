import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { EnrollmentEntity, ResourceEntity } from "@shared/entities";
import { ResourceType, ResourceVisibility } from "@shared/enums/accelerez.enum";
import { cleanEditorHtml } from "@shared/utils/editor-html";
import { AccessService } from "./access.service";
import type { UpsertResourceDto } from "./dto/portal.dto";

/**
 * The material a trainer gives their clients.
 *
 * **Reads go through `AccessService`, always.** A client sees nothing here
 * unless their month is settled — the paywall is applied when these are
 * fetched and is never stored on the row, so there is no cached flag to drift
 * out of step with what was actually paid.
 *
 * A client's list is two sets unioned: the trainer's library, which every
 * active client of theirs can read, and the rows written for that one person.
 * The union happens here rather than in the caller, so a screen cannot show one
 * half and silently omit the other.
 */
@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resources: Repository<ResourceEntity>,
    private readonly access: AccessService,
  ) {}

  // --- client --------------------------------------------------------------

  /**
   * What this client may read right now. Throws when the month is not settled —
   * the message names the month, so the client knows to talk to their trainer
   * rather than to support.
   */
  async listForClient(enrollment: EnrollmentEntity): Promise<ResourceEntity[]> {
    await this.access.assertOpen(enrollment);

    const [library, personal] = await Promise.all([
      this.resources.find({
        where: {
          trainerId: enrollment.trainerId,
          visibility: ResourceVisibility.LIBRARY,
          isPublished: true,
        },
        order: { sortOrder: "ASC", id: "DESC" },
      }),
      this.resources.find({
        where: { enrollmentId: enrollment.id, isPublished: true },
        order: { sortOrder: "ASC", id: "DESC" },
      }),
    ]);

    // Personal material first: it was written for this person, and a library
    // video should never be the first thing they see above their own plan.
    return [...personal, ...library];
  }

  /**
   * One resource, and the moment the client opened it.
   *
   * `seenAt` is stamped on the first read only — a trainer wants to know
   * whether the plan was ever opened, not how often it was scrolled past.
   */
  async openForClient(enrollment: EnrollmentEntity, id: number): Promise<ResourceEntity> {
    await this.access.assertOpen(enrollment);

    const row = await this.resources.findOne({ where: { id, isPublished: true } });
    const visible =
      row &&
      (row.enrollmentId === enrollment.id ||
        (row.visibility === ResourceVisibility.LIBRARY &&
          row.trainerId === enrollment.trainerId));

    if (!visible) throw new NotFoundException("Materialul nu există.");

    if (!row.seenAt) {
      row.seenAt = new Date();
      void this.resources.update(row.id, { seenAt: row.seenAt });
    }

    return row;
  }

  // --- trainer -------------------------------------------------------------

  /** A trainer's own material. `enrollmentId` narrows it to one client. */
  listForTrainer(trainerId: number, enrollmentId?: number): Promise<ResourceEntity[]> {
    return this.resources.find({
      where:
        enrollmentId === undefined
          ? { trainerId }
          : { trainerId, enrollmentId },
      order: { sortOrder: "ASC", id: "DESC" },
    });
  }

  /** Only the library — what every active client of theirs can read. */
  listLibrary(trainerId: number): Promise<ResourceEntity[]> {
    return this.resources.find({
      where: {
        trainerId,
        visibility: ResourceVisibility.LIBRARY,
        enrollmentId: IsNull(),
      },
      order: { sortOrder: "ASC", id: "DESC" },
    });
  }

  async create(trainerId: number, dto: UpsertResourceDto): Promise<ResourceEntity> {
    const fields = this.fields(dto);
    await this.assertOwnedTarget(trainerId, fields.visibility, fields.enrollmentId);

    return this.resources.save(this.resources.create({ ...fields, trainerId }));
  }

  async update(trainerId: number, id: number, dto: UpsertResourceDto): Promise<ResourceEntity> {
    const row = await this.resources.findOne({ where: { id, trainerId } });
    if (!row) throw new NotFoundException("Materialul nu există.");

    const fields = this.fields(dto);
    await this.assertOwnedTarget(trainerId, fields.visibility, fields.enrollmentId);

    Object.assign(row, fields);
    return this.resources.save(row);
  }

  async remove(trainerId: number, id: number): Promise<void> {
    const row = await this.resources.findOne({ where: { id, trainerId } });
    if (!row) throw new NotFoundException("Materialul nu există.");
    await this.resources.delete(id);
  }

  // --- internals -----------------------------------------------------------

  /**
   * A resource has to *have* something in it.
   *
   * Which field carries the content depends on the type: a video is a link, a
   * diet is a body, a document is a file. Checking it here rather than in the
   * DTO is deliberate — the rule is "one of three, depending on a fourth
   * field", which class-validator can express only as an unreadable pile of
   * conditionals.
   */
  private fields(dto: UpsertResourceDto) {
    const visibility = dto.visibility ?? ResourceVisibility.CLIENT;
    const enrollmentId =
      visibility === ResourceVisibility.LIBRARY ? null : (dto.enrollmentId ?? null);

    if (visibility === ResourceVisibility.CLIENT && !enrollmentId) {
      throw new BadRequestException("Alege cursantul căruia îi atribui materialul.");
    }

    const body = dto.body ? cleanEditorHtml(dto.body) : null;
    const hasContent = Boolean(dto.url?.trim() || dto.filePath?.trim() || body?.trim());

    if (!hasContent) {
      throw new BadRequestException(
        NEEDS_BODY.includes(dto.type)
          ? "Scrie conținutul sau atașează un fișier."
          : "Adaugă linkul sau încarcă fișierul.",
      );
    }

    return {
      type: dto.type,
      visibility,
      enrollmentId,
      title: dto.title.trim(),
      description: dto.description ?? null,
      url: dto.url?.trim() || null,
      filePath: dto.filePath?.trim() || null,
      body,
      isPublished: dto.isPublished ?? true,
      sortOrder: dto.sortOrder ?? 0,
    };
  }

  /**
   * A trainer may only attach material to their own client.
   *
   * Without this, `enrollmentId` is an unchecked number in a request body and
   * anybody with a trainer account could write into somebody else's client's
   * plan — the classic broken-object-level-authorisation hole, and the one this
   * product would be judged on hardest.
   */
  private async assertOwnedTarget(
    trainerId: number,
    visibility: ResourceVisibility,
    enrollmentId: number | null,
  ): Promise<void> {
    if (visibility === ResourceVisibility.LIBRARY || !enrollmentId) return;

    const owned = await this.resources.manager
      .getRepository(EnrollmentEntity)
      .findOne({ where: { id: enrollmentId, trainerId } });

    if (!owned) throw new NotFoundException("Cursantul nu este înscris la tine.");
  }
}

/** The types whose content *is* the text — see `ResourceType`. */
const NEEDS_BODY = [ResourceType.DIET, ResourceType.TIP];
