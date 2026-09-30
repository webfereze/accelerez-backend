import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ProductEntity, TrainerEntity } from "@shared/entities";
import type { ProductVariant } from "@shared/entities/product.entity";
import { PageStatus } from "@shared/enums/page-status.enum";
import { isLiveIn } from "@shared/types/locales";
import { normalize } from "@shared/types/translated";
import { cleanEditorContent } from "@shared/utils/editor-html";
import {
  assertLocalizedSlugFree,
  buildLocalizedSlug,
  slugFor,
} from "@shared/utils/localized-slug";
import { pageParams, searchTerm, type Paged } from "@shared/utils/paged";
import type { ProductQueryDto, UpsertProductDto } from "./dto/product.dto";

/** A product, with the coach it belongs to resolved. */
export type ProductWithTrainer = ProductEntity & {
  trainer: Pick<TrainerEntity, "id" | "displayName" | "photo" | "slug"> | null;
};

/**
 * The shop's products — read by a visitor, edited by an editor.
 *
 * Built the way classes are: the public list filters by status and language in
 * memory (a shop is tens of rows), and the coach is resolved in one query for
 * the whole page rather than one per card.
 */
@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly products: Repository<ProductEntity>,
    @InjectRepository(TrainerEntity)
    private readonly trainers: Repository<TrainerEntity>,
  ) {}

  // --- public --------------------------------------------------------------

  async listPublished(query: ProductQueryDto = {}): Promise<Paged<ProductWithTrainer>> {
    const locale = query.locale ?? "ro";

    const rows = await this.products.find({
      where: { status: PageStatus.PUBLISHED },
      order: { sortOrder: "ASC", id: "DESC" },
    });

    const term = query.search?.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (!isLiveIn(row.publishedLocales, locale)) return false;
      if (query.featuredOnly && !row.isFeatured) return false;
      if (query.category && row.category !== query.category) return false;
      if (!term) return true;

      return [row.title?.[locale] ?? row.title?.ro, row.excerpt?.[locale] ?? row.excerpt?.ro]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });

    const { page, perPage, skip, take } = pageParams(query);

    return {
      rows: await this.withTrainer(filtered.slice(skip, skip + take)),
      total: filtered.length,
      page,
      perPage,
    };
  }

  async findBySlug(slug: string, locale = "ro"): Promise<ProductWithTrainer> {
    const rows = await this.products.find({ where: { status: PageStatus.PUBLISHED } });

    const found = rows.find(
      (row) => slugFor(row.slug, locale) === slug && isLiveIn(row.publishedLocales, locale),
    );

    if (!found) throw new NotFoundException("Produsul nu există.");
    return (await this.withTrainer([found]))[0];
  }

  async listPublishedSlugs() {
    const rows = await this.products.find({
      where: { status: PageStatus.PUBLISHED },
      select: ["id", "slug", "publishedLocales", "updatedAt"],
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      updatedAt: row.updatedAt,
      locales: (row.publishedLocales?.length ? row.publishedLocales : ["ro"]) as string[],
    }));
  }

  /**
   * The product and variant an order is for — or 404.
   *
   * **Published only.** A draft is not for sale, and an order for one is an
   * order for something the shop never offered, whatever id the browser sent.
   */
  async findOrderable(
    productId: number,
    variantId: string,
  ): Promise<{ product: ProductEntity; variant: ProductVariant }> {
    const product = await this.products.findOne({
      where: { id: productId, status: PageStatus.PUBLISHED },
    });
    const variant = product?.variants?.find((item) => item.id === variantId);

    if (!product || !variant) throw new NotFoundException("Produsul nu mai este disponibil.");
    return { product, variant };
  }

  // --- admin ---------------------------------------------------------------

  async list(query: ProductQueryDto = {}): Promise<Paged<ProductEntity>> {
    const qb = this.products
      .createQueryBuilder("p")
      .orderBy("p.sortOrder", "ASC")
      .addOrderBy("p.id", "DESC");

    if (query.status) qb.andWhere("p.status = :status", { status: query.status });
    if (query.category) qb.andWhere("p.category = :category", { category: query.category });

    const term = searchTerm(query.search);
    if (term) {
      qb.andWhere("JSON_UNQUOTE(JSON_EXTRACT(p.title, '$.ro')) LIKE :term", { term });
    }

    const { page, perPage, skip, take } = pageParams(query);
    const [rows, total] = await qb.skip(skip).take(take).getManyAndCount();

    return { rows, total, page, perPage };
  }

  async findById(id: number): Promise<ProductEntity> {
    const row = await this.products.findOne({ where: { id } });
    if (!row) throw new NotFoundException("Produsul nu există.");
    return row;
  }

  async create(dto: UpsertProductDto): Promise<ProductEntity> {
    const slug = buildLocalizedSlug(dto.slug, dto.title);
    assertLocalizedSlugFree(slug, await this.products.find({ select: ["id", "slug"] }));

    return this.products.save(this.products.create({ ...this.fields(dto), slug: slug as never }));
  }

  async update(id: number, dto: UpsertProductDto): Promise<ProductEntity> {
    const row = await this.findById(id);

    const slug = buildLocalizedSlug(dto.slug, dto.title);
    assertLocalizedSlugFree(slug, await this.products.find({ select: ["id", "slug"] }), id);

    Object.assign(row, this.fields(dto), { slug });
    return this.products.save(row);
  }

  /** Orders keep their copy of what was bought — see `OrderEntity`. */
  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.products.delete(id);
  }

  // --- internals -----------------------------------------------------------

  private async withTrainer(rows: ProductEntity[]): Promise<ProductWithTrainer[]> {
    const ids = [...new Set(rows.map((row) => row.trainerId).filter((id): id is number => !!id))];

    const trainers = ids.length
      ? await this.trainers.find({
          where: { id: In(ids), status: PageStatus.PUBLISHED },
          select: ["id", "displayName", "photo", "slug"],
        })
      : [];
    const byId = new Map(trainers.map((trainer) => [trainer.id, trainer]));

    return rows.map((row) => ({
      ...row,
      trainer: (row.trainerId && byId.get(row.trainerId)) || null,
    }));
  }

  private fields(dto: UpsertProductDto) {
    return {
      title: normalize(dto.title),
      category: dto.category,
      excerpt: normalize(dto.excerpt),
      content: cleanEditorContent(dto.content ?? []),
      image: dto.image || null,
      imageAlt: dto.imageAlt || null,
      variants: dto.variants.map((variant) => ({
        id: variant.id,
        label: normalize(variant.label),
        price: variant.price ?? null,
        // An offer price above the price is not an offer; drop it rather
        // than print a "reduction" that goes the wrong way.
        compareAtPrice:
          variant.compareAtPrice != null &&
          variant.price != null &&
          variant.compareAtPrice > variant.price
            ? variant.compareAtPrice
            : null,
      })) as ProductVariant[],
      currency: dto.currency || "RON",
      deliveryNote: normalize(dto.deliveryNote),
      ribbon: normalize(dto.ribbon),
      trainerId: dto.trainerId ?? null,
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
