import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EnrollmentEntity, ProgressEntryEntity } from "@shared/entities";
import type { UpsertProgressDto } from "./dto/portal.dto";

/** One point, plus what changed since the one before it. */
export type ProgressPoint = ProgressEntryEntity & {
  /** Kilograms against the previous entry. Null when either has no weight. */
  deltaFromPrevious: number | null;
  /** Kilograms against the very first entry — the number people care about. */
  deltaFromStart: number | null;
};

/**
 * The client's timeline: dates, photographs, weights, notes.
 *
 * **Ordered by `takenAt`, ascending, and the deltas are computed here.** Two
 * screens show this — the client's own account and the trainer's view of that
 * client — and a subtraction done in each of them is a subtraction that
 * eventually disagrees with itself. It is also the kind of arithmetic that
 * looks obviously right and is off by one entry when a photograph is added out
 * of order, which is normal: people log last Sunday on Wednesday.
 *
 * **Not paywalled, and that is deliberate.** Everything a *trainer* produces is
 * behind the paid month; this is the client's own record of their own body. A
 * product that hides somebody's photographs of themselves because they stopped
 * paying is holding their history hostage, and this one does not.
 */
@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(ProgressEntryEntity)
    private readonly entries: Repository<ProgressEntryEntity>,
  ) {}

  /** The whole timeline, oldest first, with both deltas on every point. */
  async list(enrollmentId: number): Promise<ProgressPoint[]> {
    const rows = await this.entries.find({
      where: { enrollmentId },
      order: { takenAt: "ASC", id: "ASC" },
    });

    const first = rows.find((row) => row.weightKg != null)?.weightKg ?? null;
    let previous: number | null = null;

    return rows.map((row) => {
      const point: ProgressPoint = {
        ...row,
        deltaFromPrevious:
          row.weightKg != null && previous != null ? round(row.weightKg - previous) : null,
        deltaFromStart:
          row.weightKg != null && first != null ? round(row.weightKg - first) : null,
      };

      if (row.weightKg != null) previous = row.weightKg;
      return point;
    });
  }

  /**
   * The two ends of the story: the earliest entry with a photograph and the
   * latest one.
   *
   * Returned as a pair rather than left to the caller because "the first one
   * with a photograph" is not "the first one" — a client who logged two weights
   * before taking any pictures would otherwise get an empty frame beside a
   * photograph, which reads as a broken image.
   */
  async comparison(enrollmentId: number) {
    const rows = (await this.list(enrollmentId)).filter((row) => row.photos?.length);
    if (rows.length < 2) return null;

    return { before: rows[0], after: rows[rows.length - 1] };
  }

  async create(
    enrollment: EnrollmentEntity,
    dto: UpsertProgressDto,
  ): Promise<ProgressEntryEntity> {
    assertHasSomething(dto);

    return this.entries.save(
      this.entries.create({
        enrollmentId: enrollment.id,
        takenAt: dto.takenAt,
        photos: dto.photos ?? [],
        weightKg: dto.weightKg ?? null,
        measurements: dto.measurements ?? {},
        note: dto.note ?? null,
        consentToShare: dto.consentToShare ?? false,
      }),
    );
  }

  async update(
    enrollmentId: number,
    id: number,
    dto: UpsertProgressDto,
  ): Promise<ProgressEntryEntity> {
    const row = await this.own(enrollmentId, id);
    assertHasSomething(dto);

    Object.assign(row, {
      takenAt: dto.takenAt,
      photos: dto.photos ?? row.photos,
      weightKg: dto.weightKg ?? null,
      measurements: dto.measurements ?? row.measurements,
      note: dto.note ?? null,
      consentToShare: dto.consentToShare ?? row.consentToShare,
    });

    return this.entries.save(row);
  }

  async remove(enrollmentId: number, id: number): Promise<void> {
    await this.own(enrollmentId, id);
    await this.entries.delete(id);
  }

  /**
   * The trainer's remark on one point — the only field they may write here.
   *
   * A coach who could edit the weight or replace the photograph would be
   * editing somebody else's record of their own body. They comment; they do not
   * amend.
   */
  async comment(enrollmentId: number, id: number, note: string): Promise<ProgressEntryEntity> {
    const row = await this.own(enrollmentId, id);
    row.trainerNote = note;
    return this.entries.save(row);
  }

  private async own(enrollmentId: number, id: number): Promise<ProgressEntryEntity> {
    const row = await this.entries.findOne({ where: { id, enrollmentId } });
    if (!row) throw new NotFoundException("Înregistrarea nu există.");
    return row;
  }
}

/**
 * A date on its own is not a milestone.
 *
 * Without this an empty form saves a row that shows up on the timeline as a
 * date with nothing under it, and a timeline full of those is one nobody reads.
 */
function assertHasSomething(dto: UpsertProgressDto): void {
  const has =
    (dto.photos?.length ?? 0) > 0 ||
    dto.weightKg != null ||
    Object.keys(dto.measurements ?? {}).length > 0 ||
    Boolean(dto.note?.trim());

  if (!has) {
    throw new BadRequestException("Adaugă cel puțin o poză, o greutate sau o notă.");
  }
}

/** Two decimals. `72.4 - 71.9` is `0.5000000000000071` without it. */
const round = (value: number) => Math.round(value * 100) / 100;
