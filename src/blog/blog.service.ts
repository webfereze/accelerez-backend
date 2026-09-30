import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import { PostEntity } from "@shared/entities";
import { PageStatus } from "@shared/enums/page-status.enum";
import { isLiveIn } from "@shared/types/locales";
import {
  assertLocalizedSlugFree,
  buildLocalizedSlug,
  slugFor,
  type LocalizedSlug,
} from "@shared/utils/localized-slug";
import { paginate, searchTerm, type Paged } from "@shared/utils/paged";
import type { PostQueryDto, UpsertPostDto } from "./dto/post.dto";

/**
 * The blog, read two ways.
 *
 * The public side sees published articles only, and the rule lives here rather
 * than in every caller — a listing that forgets the filter publishes a draft
 * somebody was halfway through.
 *
 * **The public side filters on language, not just on status.** Ch. 09 is
 * explicit: "Nu schimbă limba pe ascuns." An article that was never written in
 * the requested language is simply not returned, and the front end says so
 * rather than quietly handing the reader Romanian.
 *
 * **Ordering is `publishedAt` first, `id` second.** The tiebreak matters: two
 * articles published the same morning have identical timestamps once the date
 * is backdated by hand, and without a second key their order changes between
 * requests, which makes a paginated list skip and repeat rows.
 */
@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly posts: Repository<PostEntity>,
  ) {}

  // --- public --------------------------------------------------------------

  /**
   * Published articles, newest first. Featured ones lead when asked for.
   *
   * **Returns an envelope, not an array**, because the blog index needs a total
   * to page against and the block on the home page needs a handful — one call
   * doing both beats two that can disagree about ordering. A caller that wants
   * three articles asks for `perPage: 3` and reads `rows`.
   *
   * The language filter and the search cannot go in SQL. `publishedLocales` is
   * a JSON array where an absent value means Romanian, and the search has to
   * look inside a `Translated` column in whichever language is being read — so
   * both run in memory, and **the page is taken after them**. Doing it the
   * other way would page over rows that are then filtered away, which is how a
   * listing ends up with four articles on one page and eleven on the next.
   */
  async listPublished({
    limit,
    page = 1,
    perPage,
    search,
    tag,
    category,
    specialization,
    locale = "ro",
    featuredFirst = false,
  }: {
    limit?: number;
    page?: number;
    perPage?: number;
    search?: string;
    tag?: string;
    category?: string;
    specialization?: string;
    locale?: string;
    featuredFirst?: boolean;
  } = {}): Promise<{ rows: PostEntity[]; total: number; page: number; perPage: number }> {
    const query = this.posts
      .createQueryBuilder("p")
      .where("p.status = :status", { status: PageStatus.PUBLISHED })
      // A published article with no date would sort last forever; the service
      // stamps one on publish, so this only guards hand-edited rows.
      .andWhere("p.publishedAt IS NOT NULL");

    if (featuredFirst) query.addOrderBy("p.isFeatured", "DESC");
    query.addOrderBy("p.publishedAt", "DESC").addOrderBy("p.id", "DESC");

    // `JSON_CONTAINS` rather than LIKE: "apa" must not match "apartament".
    if (tag) query.andWhere("JSON_CONTAINS(p.tags, :tag)", { tag: JSON.stringify(tag) });
    if (category) query.andWhere("p.category = :category", { category });

    // Articles for one goal — what a trainer directory filtered by "slăbire"
    // closes with. Matched on the editor's `specializations` rather than guessed
    // from the category, because an article about protein is the right one to
    // hang off both muscle gain and weight loss and a category cannot say that.
    if (specialization) {
      query.andWhere("JSON_CONTAINS(p.specializations, :specialization)", {
        specialization: JSON.stringify(specialization),
      });
    }

    const term = search?.trim().toLowerCase();

    const matches = (row: PostEntity) => {
      if (!isLiveIn(row.publishedLocales, locale)) return false;
      if (!term) return true;

      // Searched in the language being read, plus the author and the slug —
      // the three things somebody actually types into a blog's search box.
      const read = (value: unknown) =>
        String((value as Record<string, string> | null)?.[locale] ?? "");

      return [read(row.title), read(row.excerpt), read(row.slug), row.author ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    };

    const rows = (await query.getMany()).filter(matches);

    // `limit` is the blocks' way of asking for a handful and ignores paging.
    if (limit) {
      return { rows: rows.slice(0, limit), total: rows.length, page: 1, perPage: limit };
    }

    const size = Math.min(48, Math.max(1, perPage ?? 12));
    const current = Math.max(1, page);
    const start = (current - 1) * size;

    return {
      rows: rows.slice(start, start + size),
      total: rows.length,
      page: current,
      perPage: size,
    };
  }

  /**
   * By the slug **for that language**.
   *
   * Matched against the requested locale's slug only. Accepting any locale's
   * slug would make `/ro/blog/<hungarian-slug>` resolve, which is precisely the
   * silent language substitution the product rules out.
   */
  async findPublishedBySlug(slug: string, locale = "ro"): Promise<PostEntity> {
    const rows = await this.posts.find({
      where: { status: PageStatus.PUBLISHED, publishedAt: Not(IsNull()) },
    });

    const found = rows.find(
      (row) => isLiveIn(row.publishedLocales, locale) && slugFor(row.slug, locale) === slug,
    );

    if (!found) throw new NotFoundException(`Post ${slug} not found in ${locale}`);
    return found;
  }

  /**
   * The few articles to offer at the foot of one that has just been read.
   *
   * Excludes the article itself, which is the whole reason this is not just
   * `listPublished({ limit })`.
   */
  async listRelated(slug: string, limit = 3, locale = "ro"): Promise<PostEntity[]> {
    const current = await this.findPublishedBySlug(slug, locale);

    const rows = await this.posts.find({
      where: { status: PageStatus.PUBLISHED },
      order: { publishedAt: "DESC", id: "DESC" },
    });

    const live = rows.filter(
      (row) => row.id !== current.id && row.publishedAt && isLiveIn(row.publishedLocales, locale),
    );

    // What the editor chose, first and in their order — the product asks for "cel
    // mult două articole conexe", and a hand-picked pair beats anything a query
    // can infer. Newest articles only fill the remaining slots.
    const chosen = (current.relatedPostIds ?? [])
      .map((id) => live.find((row) => row.id === id))
      .filter((row): row is PostEntity => Boolean(row));

    const rest = live.filter((row) => !chosen.includes(row));

    return [...chosen, ...rest].slice(0, limit);
  }

  /**
   * The categories that actually have something in them, in the language being
   * read.
   *
   * "Nu afișați categorii goale." The closed list of five is what makes
   * this answerable at all — the filter row is built from this, not from the
   * enum, so a language with three categories' worth of articles shows three
   * buttons rather than five, two of which return nothing.
   *
   * Counted after the language filter for the same reason the listing pages
   * after it: a category with only Romanian articles is empty on `/hu/blog`.
   */
  async listCategoryCounts(
    locale = "ro",
  ): Promise<Array<{ category: string; count: number }>> {
    const published = await this.posts.find({
      where: { status: PageStatus.PUBLISHED, publishedAt: Not(IsNull()) },
      select: { category: true, publishedLocales: true },
    });

    const counts = new Map<string, number>();
    for (const post of published) {
      if (!post.category) continue;
      if (!isLiveIn(post.publishedLocales, locale)) continue;
      counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    }

    return [...counts.entries()].map(([category, count]) => ({ category, count }));
  }

  /** Every tag in use, with how many published articles carry it. */
  async listTags(): Promise<Array<{ tag: string; count: number }>> {
    const published = await this.posts.find({
      where: { status: PageStatus.PUBLISHED },
      select: { tags: true },
    });

    const counts = new Map<string, number>();
    for (const post of published) {
      for (const tag of post.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  /** Every published slug, per language, for the sitemap and the switcher. */
  async listPublishedSlugs(): Promise<
    Array<{ id: number; slug: Record<string, string>; locales: string[]; updatedAt: Date }>
  > {
    const rows = await this.posts.find({ where: { status: PageStatus.PUBLISHED } });
    return rows.map((row) => ({
      id: row.id,
      slug: (row.slug ?? {}) as Record<string, string>,
      locales: (row.publishedLocales ?? ["ro"]) as string[],
      updatedAt: row.updatedAt,
    }));
  }

  // --- admin ---------------------------------------------------------------

  list(query: PostQueryDto): Promise<Paged<PostEntity>> {
    const builder = this.posts
      .createQueryBuilder("p")
      // Drafts have no `publishedAt`, and would otherwise sink to the bottom of
      // the very screen where they still need working on.
      .orderBy("COALESCE(p.publishedAt, p.createdAt)", "DESC")
      .addOrderBy("p.id", "DESC");

    if (query.status) builder.andWhere("p.status = :status", { status: query.status });
    if (query.category) builder.andWhere("p.category = :category", { category: query.category });
    if (query.tag) {
      builder.andWhere("JSON_CONTAINS(p.tags, :tag)", { tag: JSON.stringify(query.tag) });
    }

    const term = searchTerm(query.search);
    if (term) {
      // `JSON_VALUE`, never `LIKE` on the raw column — that matches the keys as
      // well as the values, so searching for "ro" returns every row.
      builder.andWhere(
        "(JSON_VALUE(p.title, '$.ro') LIKE :term OR JSON_VALUE(p.title, '$.hu') LIKE :term OR JSON_VALUE(p.slug, '$.ro') LIKE :term OR p.author LIKE :term)",
        { term },
      );
    }

    return paginate(builder, query);
  }

  async findById(id: number): Promise<PostEntity> {
    const found = await this.posts.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Post ${id} not found`);
    return found;
  }

  async create(dto: UpsertPostDto): Promise<PostEntity> {
    const slug = await this.resolveSlug(dto);

    return this.posts.save(
      this.posts.create({
        ...this.fields(dto),
        slug,
        publishedAt: this.resolvePublishedAt(dto, null),
      }),
    );
  }

  async update(id: number, dto: UpsertPostDto): Promise<PostEntity> {
    const existing = await this.findById(id);
    const slug = await this.resolveSlug(dto, id);
    const publishedAt = this.resolvePublishedAt(dto, existing.publishedAt);

    Object.assign(existing, this.fields(dto), { slug, publishedAt });
    return this.posts.save(existing);
  }

  async remove(id: number): Promise<void> {
    await this.posts.remove(await this.findById(id));
  }

  /**
   * Everything off the DTO that can be assigned straight onto the entity.
   *
   * The two dates are lifted out because the wire carries them as ISO strings
   * and the columns are `Date`s. `publishedAt` is handled separately — it has a
   * rule of its own — while `contentUpdatedAt` only needs converting, and a
   * cleared field must become `null` rather than `Invalid Date`.
   */
  private fields(dto: UpsertPostDto): Partial<PostEntity> {
    const { publishedAt: _ignored, contentUpdatedAt, ...rest } = dto;
    return {
      ...(rest as unknown as Partial<PostEntity>),
      ...(contentUpdatedAt === undefined
        ? {}
        : { contentUpdatedAt: contentUpdatedAt ? new Date(contentUpdatedAt) : null }),
    };
  }

  /**
   * When an article counts as published.
   *
   * Stamped the first time it goes live and then **never moved**, so fixing a
   * typo next year does not jump a two-year-old piece to the top of the blog.
   * An explicit date always wins, which is how an editor backdates something
   * written before the site existed.
   */
  private resolvePublishedAt(dto: UpsertPostDto, current: Date | null): Date | null {
    if (dto.publishedAt) return new Date(dto.publishedAt);
    if (current) return current;
    return dto.status === PageStatus.PUBLISHED ? new Date() : null;
  }

  /**
   * The slugs an editor asked for, or ones derived from the titles — refused if
   * any is taken **in its own language**.
   *
   * Refused rather than silently suffixed: a slug is a URL somebody may already
   * have shared, and quietly turning `drumetie-de-toamna` into
   * `drumetie-de-toamna-2` gives two articles that look identical in the admin.
   */
  private async resolveSlug(dto: UpsertPostDto, id?: number): Promise<LocalizedSlug> {
    const wanted = buildLocalizedSlug(dto.slug, dto.title);
    assertLocalizedSlugFree(
      wanted,
      await this.posts.find({ select: { id: true, slug: true } }),
      id,
    );
    return wanted;
  }
}
