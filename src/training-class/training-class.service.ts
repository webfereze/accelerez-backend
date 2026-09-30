import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TrainerEntity, TrainingClassEntity } from "@shared/entities";
import { PageStatus } from "@shared/enums/page-status.enum";
import { isLiveIn } from "@shared/types/locales";
import { normalize } from "@shared/types/translated";
import {
  assertLocalizedSlugFree,
  buildLocalizedSlug,
  slugFor,
} from "@shared/utils/localized-slug";
import { pageParams, type Paged } from "@shared/utils/paged";
import type {
  TrainingClassQueryDto,
  UpdateOwnClassDto,
  UpsertTrainingClassDto,
} from "./dto/training-class.dto";

/** A class, with the coaches who run it resolved. */
export type ClassWithTrainers = TrainingClassEntity & {
  trainers: Array<Pick<TrainerEntity, "id" | "displayName" | "photo" | "slug">>;
};

/**
 * Classes, read by a visitor and edited by an editor.
 *
 * **The trainers are resolved here, in one query for the whole page.** The card
 * shows who runs the class, and doing that per card would be one query per card
 * — the classic list that gets slower the more classes there are. Unpublished
 * or deleted coaches simply drop out of the array rather than rendering as a
 * gap, because a class outlives the person who used to teach it.
 *
 * Language filtering runs in memory for the same reason it does everywhere
 * else: `publishedLocales` is a JSON array whose absence means Romanian, and
 * the search has to look inside `Translated` columns in the language being
 * read. Paging happens after both.
 */
@Injectable()
export class TrainingClassService {
  constructor(
    @InjectRepository(TrainingClassEntity)
    private readonly classes: Repository<TrainingClassEntity>,
    @InjectRepository(TrainerEntity)
    private readonly trainers: Repository<TrainerEntity>,
  ) {}

  // --- public --------------------------------------------------------------

  async listPublished(query: TrainingClassQueryDto = {}): Promise<Paged<ClassWithTrainers>> {
    const locale = query.locale ?? "ro";

    const rows = await this.classes.find({
      where: { status: PageStatus.PUBLISHED },
      order: { isFeatured: "DESC", sortOrder: "ASC", id: "DESC" },
    });

    const term = query.search?.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (!isLiveIn(row.publishedLocales, locale)) return false;
      if (query.featuredOnly && !row.isFeatured) return false;
      if (query.specialization && !row.specializations?.includes(query.specialization)) {
        return false;
      }
      if (!term) return true;

      const haystack = [
        row.title?.[locale] ?? row.title?.ro,
        row.excerpt?.[locale] ?? row.excerpt?.ro,
        row.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    const { page, perPage, skip, take } = pageParams(query);
    const slice = filtered.slice(skip, skip + take);

    return {
      rows: await this.withTrainers(slice),
      total: filtered.length,
      page,
      perPage,
    };
  }

  /** One class, by the slug of the language being read. */
  async findBySlug(slug: string, locale = "ro"): Promise<ClassWithTrainers> {
    const rows = await this.classes.find({ where: { status: PageStatus.PUBLISHED } });

    const found = rows.find(
      (row) => slugFor(row.slug, locale) === slug && isLiveIn(row.publishedLocales, locale),
    );

    if (!found) throw new NotFoundException("Clasa nu există.");
    return (await this.withTrainers([found]))[0];
  }

  /** One published class by id — for the portal's eligibility check. */
  async findByIdPublic(id: number): Promise<TrainingClassEntity> {
    const row = await this.classes.findOne({
      where: { id, status: PageStatus.PUBLISHED },
    });

    if (!row) throw new NotFoundException("Clasa nu există.");
    return row;
  }

  /** Every published class's slug per language — what `getStaticPaths` emits. */
  async listPublishedSlugs() {
    const rows = await this.classes.find({
      where: { status: PageStatus.PUBLISHED },
      select: ["id", "slug", "publishedLocales"],
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      locales: (row.publishedLocales?.length ? row.publishedLocales : ["ro"]) as string[],
    }));
  }

  /** The classes one trainer runs — shown on their profile. */
  async listForTrainer(trainerId: number, locale = "ro"): Promise<TrainingClassEntity[]> {
    const rows = await this.classes.find({ where: { status: PageStatus.PUBLISHED } });

    return rows.filter(
      (row) =>
        (row.trainerIds ?? []).includes(trainerId) &&
        isLiveIn(row.publishedLocales, locale),
    );
  }

  /**
   * Every class a trainer is on, **drafts included**, for their own portal.
   *
   * Unlike the public list this does not filter by language or status: a coach
   * needs to see the class that is still being written as much as the one that
   * is live — it is on their schedule either way, and a class that vanishes
   * from their own screen until an editor publishes it is a class they turn up
   * to without knowing it exists.
   */
  async listForTrainerPortal(trainerId: number): Promise<TrainingClassEntity[]> {
    const rows = await this.classes.find({
      order: { sortOrder: "ASC", id: "DESC" },
    });

    return rows.filter((row) => (row.trainerIds ?? []).includes(trainerId));
  }

  /**
   * A class created by a trainer, from their own portal.
   *
   * They are added to it whatever they sent, so the class appears on their
   * screen the moment it exists — creating something you then cannot find is
   * the worst possible first use of a feature.
   */
  async createAsTrainer(
    trainerId: number,
    dto: UpdateOwnClassDto,
  ): Promise<TrainingClassEntity> {
    const slug = buildLocalizedSlug(dto.slug, dto.title);
    assertLocalizedSlugFree(slug, await this.classes.find({ select: ["id", "slug"] }));

    return this.classes.save(
      this.classes.create({
        ...this.ownFields(dto, trainerId),
        slug: slug as never,
        // Not theirs to set — see `UpdateOwnClassDto`.
        isFeatured: false,
        sortOrder: 0,
      }),
    );
  }

  /** One of their own classes, or 404. Never somebody else's. */
  async findForTrainer(trainerId: number, id: number): Promise<TrainingClassEntity> {
    const row = await this.classes.findOne({ where: { id } });

    if (!row || !(row.trainerIds ?? []).includes(trainerId)) {
      throw new NotFoundException("Clasa nu există.");
    }

    return row;
  }

  async updateAsTrainer(
    trainerId: number,
    id: number,
    dto: UpdateOwnClassDto,
  ): Promise<TrainingClassEntity> {
    const row = await this.findForTrainer(trainerId, id);

    const slug = buildLocalizedSlug(dto.slug, dto.title);
    assertLocalizedSlugFree(slug, await this.classes.find({ select: ["id", "slug"] }), id);

    // `isFeatured` and `sortOrder` are not in the DTO and so are not in the
    // spread — the row keeps whatever an administrator set.
    Object.assign(row, this.ownFields(dto, trainerId), { slug });
    return this.classes.save(row);
  }

  /**
   * Removing a class a trainer shares with somebody else takes them off it
   * instead of deleting it: the class is still running, and one coach leaving
   * is not the platform's decision to cancel it.
   */
  async removeAsTrainer(trainerId: number, id: number): Promise<void> {
    const row = await this.findForTrainer(trainerId, id);
    const others = (row.trainerIds ?? []).filter((value) => value !== trainerId);

    if (others.length > 0) {
      await this.classes.update(id, { trainerIds: others });
      return;
    }

    await this.classes.delete(id);
  }

  // --- admin ---------------------------------------------------------------

  async list(query: TrainingClassQueryDto = {}): Promise<Paged<TrainingClassEntity>> {
    const qb = this.classes
      .createQueryBuilder("c")
      .orderBy("c.sortOrder", "ASC")
      .addOrderBy("c.id", "DESC");

    if (query.status) qb.andWhere("c.status = :status", { status: query.status });

    const term = query.search?.trim();
    if (term) {
      qb.andWhere("JSON_UNQUOTE(JSON_EXTRACT(c.title, '$.ro')) LIKE :term", {
        term: `%${term}%`,
      });
    }

    const { page, perPage, skip, take } = pageParams(query);
    const [rows, total] = await qb.skip(skip).take(take).getManyAndCount();

    return { rows, total, page, perPage };
  }

  async findById(id: number): Promise<TrainingClassEntity> {
    const row = await this.classes.findOne({ where: { id } });
    if (!row) throw new NotFoundException("Clasa nu există.");
    return row;
  }

  async create(dto: UpsertTrainingClassDto): Promise<TrainingClassEntity> {
    const slug = buildLocalizedSlug(dto.slug, dto.title);
    assertLocalizedSlugFree(slug, await this.classes.find({ select: ["id", "slug"] }));

    return this.classes.save(
      this.classes.create({ ...this.fields(dto), slug: slug as never }),
    );
  }

  async update(id: number, dto: UpsertTrainingClassDto): Promise<TrainingClassEntity> {
    const row = await this.findById(id);

    const slug = buildLocalizedSlug(dto.slug, dto.title);
    assertLocalizedSlugFree(slug, await this.classes.find({ select: ["id", "slug"] }), id);

    Object.assign(row, this.fields(dto), { slug });
    return this.classes.save(row);
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.classes.delete(id);
  }

  // --- internals -----------------------------------------------------------

  /** One query for the whole page — see the class note. */
  private async withTrainers(rows: TrainingClassEntity[]): Promise<ClassWithTrainers[]> {
    const ids = [...new Set(rows.flatMap((row) => row.trainerIds ?? []))];

    const trainers = ids.length
      ? await this.trainers.find({
          where: { id: In(ids), status: PageStatus.PUBLISHED },
          select: ["id", "displayName", "photo", "slug"],
        })
      : [];

    const byId = new Map(trainers.map((trainer) => [trainer.id, trainer]));

    return rows.map((row) => ({
      ...row,
      // In the editor's order, and silently short when a coach is unpublished:
      // a class outlives the person who used to teach it.
      trainers: (row.trainerIds ?? [])
        .map((id) => byId.get(id))
        .filter((trainer): trainer is TrainerEntity => Boolean(trainer)),
    }));
  }

  /**
   * The trainer's own fields, with themselves kept on the class.
   *
   * The owner is re-added after the spread rather than validated in the DTO,
   * because the rule is about who is asking — which a DTO cannot see.
   */
  private ownFields(dto: UpdateOwnClassDto, trainerId: number) {
    const fields = this.fields(dto as UpsertTrainingClassDto);

    return {
      ...fields,
      trainerIds: [...new Set([...(dto.trainerIds ?? []), trainerId])],
    };
  }

  private fields(dto: UpsertTrainingClassDto) {
    return {
      title: normalize(dto.title),
      excerpt: normalize(dto.excerpt),
      content: dto.content ?? [],
      image: dto.image ?? null,
      imageAlt: dto.imageAlt ?? null,
      scheduleText: normalize(dto.scheduleText),
      startsOn: dto.startsOn || null,
      weekdays: dto.weekdays ?? [],
      startTime: dto.startTime || null,
      meetingUrl: dto.meetingUrl || null,
      durationMinutes: dto.durationMinutes ?? null,
      pricePerSession: dto.pricePerSession ?? null,
      pricePerMonth: dto.pricePerMonth ?? null,
      currency: dto.currency ?? "RON",
      ribbon: normalize(dto.ribbon),
      location: dto.location ?? undefined,
      place: dto.place ?? null,
      city: dto.city ?? null,
      capacity: dto.capacity ?? null,
      specializations: dto.specializations ?? [],
      trainerIds: dto.trainerIds ?? [],
      status: dto.status ?? PageStatus.DRAFT,
      isFeatured: dto.isFeatured ?? false,
      publishedLocales: (dto.publishedLocales ?? ["ro"]) as never,
      sortOrder: dto.sortOrder ?? 0,
      seoTitle: normalize(dto.seoTitle),
      seoDescription: normalize(dto.seoDescription),
      noindex: dto.noindex ?? false,
    };
  }
}
