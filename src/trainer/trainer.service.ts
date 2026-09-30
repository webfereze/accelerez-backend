import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { EnrollmentEntity, TrainerEntity, UserEntity } from "@shared/entities";
import { EnrollmentStatus } from "@shared/enums/accelerez.enum";
import { PageStatus } from "@shared/enums/page-status.enum";
import { UserRole } from "@shared/enums/user-role.enum";
import { isLiveIn } from "@shared/types/locales";
import { normalize } from "@shared/types/translated";
import {
  assertLocalizedSlugFree,
  buildLocalizedSlug,
  slugFor,
} from "@shared/utils/localized-slug";
import { pageParams, type Paged } from "@shared/utils/paged";
import { assignSlug } from "@shared/utils/user-slug";
import type {
  TrainerQueryDto,
  UpdateOwnProfileDto,
  UpsertTrainerDto,
} from "./dto/trainer.dto";

/**
 * Trainers, read three ways: by a visitor, by an administrator, and by the
 * trainer themselves.
 *
 * **The public side filters on language as well as status.** A profile written
 * only in Romanian is not returned for `/en/trainers` — the visitor is told the
 * profile does not exist in English rather than quietly handed Romanian.
 *
 * **Filtering and search run in memory, and the page is taken afterwards.**
 * `publishedLocales` is a JSON array whose absence means Romanian, and the
 * search has to look inside `Translated` columns in the language being read;
 * neither expresses in SQL without a full table scan of JSON functions. Paging
 * first and filtering second is how a directory ends up showing four cards on
 * one page and eleven on the next.
 */
@Injectable()
export class TrainerService {
  constructor(
    @InjectRepository(TrainerEntity)
    private readonly trainers: Repository<TrainerEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
  ) {}

  // --- public --------------------------------------------------------------

  /** The directory. Published profiles, live in the requested language. */
  async listPublished(query: TrainerQueryDto = {}): Promise<Paged<TrainerEntity>> {
    const locale = query.locale ?? "ro";
    const rows = await this.trainers.find({
      where: { status: PageStatus.PUBLISHED },
      order: { isFeatured: "DESC", sortOrder: "ASC", id: "DESC" },
    });

    const term = query.search?.trim().toLowerCase();
    const matches = (row: TrainerEntity) => {
      if (!isLiveIn(row.publishedLocales, locale)) return false;
      if (query.acceptingOnly && !row.isAcceptingClients) return false;
      if (query.specialization && !row.specializations?.includes(query.specialization)) {
        return false;
      }
      if (query.format && !row.formats?.includes(query.format)) return false;
      if (query.city && row.city?.toLowerCase() !== query.city.toLowerCase()) return false;
      if (!term) return true;

      // What somebody actually types into a directory's search box: a name, a
      // city, or the sentence under the name.
      const haystack = [
        row.displayName,
        row.city,
        row.county,
        row.headline?.[locale] ?? row.headline?.ro,
        row.excerpt?.[locale] ?? row.excerpt?.ro,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    };

    const filtered = rows.filter(matches);
    const { page, perPage, skip, take } = pageParams(query);

    return {
      rows: filtered.slice(skip, skip + take),
      total: filtered.length,
      page,
      perPage,
    };
  }

  /**
   * One profile, by the slug of the language being read.
   *
   * Matched against that language's slug **only**: a Romanian slug under
   * `/hu/antrenori/` is a 404, not a redirect, because serving one language's
   * content at another language's address is the thing the whole
   * `publishedLocales` apparatus exists to prevent.
   */
  async findBySlug(slug: string, locale = "ro"): Promise<TrainerEntity> {
    const rows = await this.trainers.find({ where: { status: PageStatus.PUBLISHED } });
    const found = rows.find(
      (row) => slugFor(row.slug, locale) === slug && isLiveIn(row.publishedLocales, locale),
    );

    if (!found) throw new NotFoundException("Antrenorul nu există.");
    return found;
  }

  /**
   * Every published profile's slug, per language — what `getStaticPaths` emits
   * one path per language from.
   */
  async listPublishedSlugs(): Promise<{ id: number; slug: unknown; locales: string[] }[]> {
    const rows = await this.trainers.find({
      where: { status: PageStatus.PUBLISHED },
      select: ["id", "slug", "publishedLocales"],
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      locales: (row.publishedLocales?.length ? row.publishedLocales : ["ro"]) as string[],
    }));
  }

  /** The cities that actually have a published trainer — the filter's options. */
  async listCities(): Promise<string[]> {
    const rows = await this.trainers.find({
      where: { status: PageStatus.PUBLISHED },
      select: ["city"],
    });

    return [...new Set(rows.map((r) => r.city).filter((c): c is string => !!c))].sort(
      (a, b) => a.localeCompare(b, "ro"),
    );
  }

  /**
   * How many active clients a trainer has, and how many places are left.
   *
   * Counted rather than stored: a cached number that drifts from the enrolment
   * table shows "2 locuri libere" on a profile that then refuses the sign-up.
   */
  async occupancy(trainerId: number): Promise<{ active: number; capacity: number | null; free: number | null }> {
    const trainer = await this.trainers.findOne({ where: { id: trainerId } });
    if (!trainer) throw new NotFoundException("Antrenorul nu există.");

    const active = await this.enrollments.count({
      where: { trainerId, status: EnrollmentStatus.ACTIVE },
    });

    return {
      active,
      capacity: trainer.capacity ?? null,
      free: trainer.capacity == null ? null : Math.max(trainer.capacity - active, 0),
    };
  }

  // --- admin ---------------------------------------------------------------

  /** Every profile, drafts included. */
  async list(query: TrainerQueryDto = {}): Promise<Paged<TrainerEntity>> {
    const qb = this.trainers
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.user", "user")
      .orderBy("t.sortOrder", "ASC")
      .addOrderBy("t.id", "DESC");

    if (query.status) qb.andWhere("t.status = :status", { status: query.status });

    const term = query.search?.trim();
    if (term) {
      qb.andWhere("(t.displayName LIKE :term OR user.email LIKE :term)", {
        term: `%${term}%`,
      });
    }

    const { page, perPage, skip, take } = pageParams(query);
    const [rows, total] = await qb.skip(skip).take(take).getManyAndCount();

    return { rows, total, page, perPage };
  }

  async findById(id: number): Promise<TrainerEntity> {
    const trainer = await this.trainers.findOne({ where: { id }, relations: ["user"] });
    if (!trainer) throw new NotFoundException("Antrenorul nu există.");
    return trainer;
  }

  /** The profile behind a signed-in trainer's token. */
  async findByUserId(userId: number): Promise<TrainerEntity> {
    const trainer = await this.trainers.findOne({ where: { userId } });
    if (!trainer) {
      throw new NotFoundException(
        "Contul acesta nu are un profil de antrenor. Contactează administratorul.",
      );
    }
    return trainer;
  }

  /**
   * Creates the account and the profile together.
   *
   * A password is required here and only here: an administrator hands it over,
   * and the trainer changes it at first sign-in. Generating one and e-mailing
   * it is the better flow and is waiting on the mail transport.
   */
  async create(dto: UpsertTrainerDto): Promise<TrainerEntity> {
    if (!dto.password) {
      throw new BadRequestException("Parola inițială este obligatorie la creare.");
    }

    const email = dto.email.trim().toLowerCase();
    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException("Există deja un cont cu această adresă de e-mail.");
    }

    const user = await this.users.save(
      this.users.create({
        email,
        slug: await assignSlug(this.users, {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email,
        }),
        password: await bcrypt.hash(dto.password, 10),
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        role: UserRole.TRAINER,
        locale: (dto.accountLocale as never) ?? "ro",
        isActive: dto.isActive ?? true,
      }),
    );

    const slug = buildLocalizedSlug(dto.slug, {
      ro: dto.displayName,
      hu: dto.displayName,
      en: dto.displayName,
    });
    assertLocalizedSlugFree(slug, await this.trainers.find({ select: ["id", "slug"] }));

    return this.trainers.save(
      this.trainers.create({
        ...this.profileFields(dto),
        userId: user.id,
        slug: slug as never,
      }),
    );
  }

  async update(id: number, dto: UpsertTrainerDto): Promise<TrainerEntity> {
    const trainer = await this.findById(id);

    const email = dto.email.trim().toLowerCase();
    const clash = await this.users.findOne({ where: { email } });
    if (clash && clash.id !== trainer.userId) {
      throw new ConflictException("Adresa de e-mail aparține altui cont.");
    }

    // An absent password means "leave it alone" — not an empty one. Sending the
    // current hash back to the form and saving it again would re-hash a hash.
    await this.users.update(trainer.userId, {
      email,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      isActive: dto.isActive ?? true,
      ...(dto.password ? { password: await bcrypt.hash(dto.password, 10) } : {}),
    });

    const slug = buildLocalizedSlug(dto.slug, {
      ro: dto.displayName,
      hu: dto.displayName,
      en: dto.displayName,
    });
    assertLocalizedSlugFree(slug, await this.trainers.find({ select: ["id", "slug"] }), id);

    Object.assign(trainer, this.profileFields(dto), { slug });
    return this.trainers.save(trainer);
  }

  /**
   * What a trainer may change about themselves. Publication, featuring, SEO and
   * the account's e-mail are not in `UpdateOwnProfileDto` and so cannot arrive
   * here — see that class.
   */
  async updateOwn(userId: number, dto: UpdateOwnProfileDto): Promise<TrainerEntity> {
    const trainer = await this.findByUserId(userId);

    Object.assign(trainer, {
      ...dto,
      headline: dto.headline ? normalize(dto.headline) : trainer.headline,
      excerpt: dto.excerpt ? normalize(dto.excerpt) : trainer.excerpt,
    });

    return this.trainers.save(trainer);
  }

  /**
   * Removes the profile **and** the account behind it.
   *
   * The account goes because a trainer login with no profile can sign in and
   * then see an error on every screen, which is worse than not being able to
   * sign in at all. Enrolments cascade — and that is the reason a coach who has
   * merely stopped working should be unpublished, not deleted.
   */
  async remove(id: number): Promise<void> {
    const trainer = await this.findById(id);
    await this.trainers.delete(id);
    await this.users.delete(trainer.userId);
  }

  /** The profile half of the admin DTO, normalised. */
  private profileFields(dto: UpsertTrainerDto) {
    return {
      displayName: dto.displayName.trim(),
      headline: normalize(dto.headline),
      excerpt: normalize(dto.excerpt),
      content: dto.content ?? [],
      photo: dto.photo ?? null,
      coverImage: dto.coverImage ?? null,
      city: dto.city ?? null,
      county: dto.county ?? null,
      formats: dto.formats ?? [],
      specializations: dto.specializations ?? [],
      yearsExperience: dto.yearsExperience ?? null,
      certifications: dto.certifications ?? [],
      monthlyPrice: dto.monthlyPrice ?? null,
      currency: dto.currency ?? "RON",
      capacity: dto.capacity ?? null,
      isAcceptingClients: dto.isAcceptingClients ?? true,
      isFeatured: dto.isFeatured ?? false,
      phone: dto.phone ?? null,
      publicEmail: dto.publicEmail ?? null,
      social: dto.social ?? {},
      status: dto.status ?? PageStatus.DRAFT,
      publishedLocales: (dto.publishedLocales ?? ["ro"]) as never,
      sortOrder: dto.sortOrder ?? 0,
      seoTitle: normalize(dto.seoTitle),
      seoDescription: normalize(dto.seoDescription),
      noindex: dto.noindex ?? false,
    };
  }
}
