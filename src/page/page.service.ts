import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { PageEntity, UserEntity } from "@shared/entities";
import { PageStatus } from "@shared/enums/page-status.enum";
import { PageLayout } from "@shared/enums/page-layout.enum";
import { normalize, pick, type Translated } from "@shared/types/translated";
import type { Block } from "@shared/types/blocks";
import { slugify, uniqueSlug } from "@shared/utils/slugify";
import { RevalidationService } from "@shared/services/revalidation.service";
import { cleanEditorContent } from "@shared/utils/editor-html";
import { UpsertPageDto } from "./dto/upsert-page.dto";

@Injectable()
export class PageService {
  constructor(
    @InjectRepository(PageEntity)
    private readonly pages: Repository<PageEntity>,
    private readonly revalidation: RevalidationService,
  ) {}

  /**
   * The URLs a page occupies. The homepage answers at `/` as well as its own
   * slug, so both have to be dropped or the front page keeps the old copy.
   */
  private pathsFor(page: PageEntity): string[] {
    const paths = [`/${page.slug}`];
    if (page.isHomepage) paths.push("/");
    return paths;
  }

  // --- public API --------------------------------------------------------

  /** A published page by slug. Drafts are invisible here, by design. */
  /**
   * One published page, **with its parent's slug and title when it has one**.
   *
   * The parent travels with the page because the only thing that wants it is
   * the breadcrumb, and the alternative is the front end fetching the whole
   * page list on every inner page to look up one title. The tree is one level
   * deep (see `assertParentIsValid`), so this is one extra row at most and
   * never a recursive walk.
   *
   * It is attached rather than joined through a relation: `parentId` is a plain
   * column here, and adding a TypeORM relation for a field two templates read
   * would put a join on every page query in the application.
   */
  async findPublishedBySlug(slug: string): Promise<PageEntity> {
    const page = await this.pages.findOne({
      where: { slug, status: PageStatus.PUBLISHED },
    });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);

    if (page.parentId) {
      // Two columns, not the whole row — the breadcrumb needs a label and an
      // address and nothing else. No cast: `select` narrows what is *fetched*,
      // and the two fields are read straight off the result.
      const parent = await this.pages.findOne({
        where: { id: page.parentId, status: PageStatus.PUBLISHED },
        select: { slug: true, title: true },
      });

      // Only a *published* parent. A breadcrumb step leading to a draft is a
      // 404 the page itself puts in front of the reader.
      if (parent) {
        Object.assign(page, {
          parent: { slug: parent.slug, title: parent.title },
        });
      }
    }

    return page;
  }

  /** The page flagged as the front page, if one is set. */
  findHomepage(): Promise<PageEntity | null> {
    return this.pages.findOne({
      where: { isHomepage: true, status: PageStatus.PUBLISHED },
    });
  }

  /** Every published slug — feeds `getStaticPaths` and the sitemap. */
  async listPublishedSlugs(): Promise<Array<{ slug: string; updatedAt: Date }>> {
    return this.pages.find({
      where: { status: PageStatus.PUBLISHED },
      select: ["slug", "updatedAt"],
      order: { sortOrder: "ASC", id: "ASC" },
    });
  }

  // --- admin API ---------------------------------------------------------

  listAll(): Promise<PageEntity[]> {
    return this.pages.find({ order: { sortOrder: "ASC", id: "ASC" } });
  }

  async findById(id: number): Promise<PageEntity> {
    const page = await this.pages.findOne({ where: { id } });
    if (!page) throw new NotFoundException(`Page ${id} not found`);
    return page;
  }

  async create(dto: UpsertPageDto, editor: UserEntity): Promise<PageEntity> {
    const slug = await this.resolveSlug(dto, null);
    await this.assertParentIsValid(dto.parentId ?? null, null);

    const page = this.pages.create({
      ...this.toColumns(dto, null),
      slug,
      updatedById: editor.id,
    });

    const saved = await this.pages.save(page);
    if (dto.isHomepage) await this.makeSoleHomepage(saved.id);

    const fresh = await this.findById(saved.id);
    this.revalidation.revalidate(this.pathsFor(fresh));
    return fresh;
  }

  async update(
    id: number,
    dto: UpsertPageDto,
    editor: UserEntity,
  ): Promise<PageEntity> {
    const existing = await this.findById(id);
    const slug = await this.resolveSlug(dto, existing);
    await this.assertParentIsValid(dto.parentId ?? null, id);

    await this.pages.save({
      ...existing,
      ...this.toColumns(dto, existing),
      slug,
      updatedById: editor.id,
    });

    if (dto.isHomepage) await this.makeSoleHomepage(id);

    const fresh = await this.findById(id);
    // Both the old and the new URL: renaming a slug, or handing the homepage
    // flag to another page, leaves a stale copy behind at the previous one.
    this.revalidation.revalidate([
      ...new Set([...this.pathsFor(existing), ...this.pathsFor(fresh)]),
    ]);
    return fresh;
  }

  async remove(id: number): Promise<void> {
    const page = await this.findById(id);

    // `onDelete: RESTRICT` would surface as a driver error; check first so the
    // editor gets a sentence instead of a 500.
    const children = await this.pages.count({ where: { parentId: id } });
    if (children > 0) {
      throw new ConflictException(
        "Ennek az oldalnak vannak aloldalai — előbb azokat kell áthelyezni vagy törölni.",
      );
    }

    await this.pages.remove(page);
    this.revalidation.revalidate(this.pathsFor(page));
  }

  // --- internals ---------------------------------------------------------

  /**
   * Maps the DTO onto entity columns.
   *
   * `publishedAt` is stamped the first time a page goes live and never moved
   * afterwards — it is the publication date a reader sees, not the last edit.
   * Unpublishing clears it, so a later re-publish dates from then.
   */
  private toColumns(
    dto: UpsertPageDto,
    existing: PageEntity | null,
  ): Partial<PageEntity> {
    const status = dto.status ?? PageStatus.DRAFT;

    let publishedAt: Date | null = existing?.publishedAt ?? null;
    if (status === PageStatus.PUBLISHED) {
      publishedAt = publishedAt ?? new Date();
    } else {
      publishedAt = null;
    }

    return {
      publishedAt,
      title: normalize(dto.title as Translated),
      excerpt: normalize(dto.excerpt as Translated),
      content: cleanEditorContent((dto.content ?? []) as Block[]),
      sidebar: cleanEditorContent((dto.sidebar ?? []) as Block[]),
      layout: dto.layout ?? PageLayout.FULL,
      status,
      sortOrder: dto.sortOrder ?? 0,
      parentId: dto.parentId ?? null,
      isHomepage: dto.isHomepage ?? false,
      seoTitle: normalize(dto.seoTitle as Translated),
      seoDescription: normalize(dto.seoDescription as Translated),
      noindex: dto.noindex ?? false,
    };
  }

  /**
   * Uses the given slug, or derives one from the Hungarian title. Uniqueness is
   * resolved by suffixing rather than rejecting — an editor naming two pages
   * "Kapcsolat" should not have to invent a slug.
   */
  private async resolveSlug(
    dto: UpsertPageDto,
    existing: PageEntity | null,
  ): Promise<string> {
    const requested = dto.slug?.trim() || slugify(pick(dto.title as Translated));

    if (!requested) {
      throw new BadRequestException("Az oldal címéből nem képezhető slug.");
    }
    if (existing && requested === existing.slug) return existing.slug;

    const clashes = await this.pages.find({
      where: existing ? { id: Not(existing.id) } : {},
      select: ["slug"],
    });

    return uniqueSlug(
      requested,
      clashes.map((p) => p.slug),
    );
  }

  /** A page cannot be its own parent, and the tree is only one level deep. */
  private async assertParentIsValid(
    parentId: number | null,
    selfId: number | null,
  ): Promise<void> {
    if (parentId == null) return;

    if (parentId === selfId) {
      throw new BadRequestException("Egy oldal nem lehet önmaga szülője.");
    }

    const parent = await this.pages.findOne({ where: { id: parentId } });
    if (!parent) throw new BadRequestException("A megadott szülőoldal nem létezik.");

    if (parent.parentId != null) {
      throw new BadRequestException(
        "Az oldalak legfeljebb két szintig ágazhatnak — a választott oldal már aloldal.",
      );
    }

    // Re-parenting a page that has children of its own would create a third level.
    if (selfId != null) {
      const hasChildren = await this.pages.count({ where: { parentId: selfId } });
      if (hasChildren > 0) {
        throw new BadRequestException(
          "Ennek az oldalnak vannak aloldalai, ezért nem tehető más oldal alá.",
        );
      }
    }
  }

  /** Clears the homepage flag everywhere else and stamps it here. */
  private async makeSoleHomepage(id: number): Promise<void> {
    await this.pages.update({ id: Not(id) }, { isHomepage: false });
    await this.pages.update(id, { isHomepage: true });
  }
}
