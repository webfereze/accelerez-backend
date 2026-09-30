import { Controller, Get, Param, Query } from "@nestjs/common";
import { BlogService } from "./blog.service";

/**
 * Public: published articles only — the service guarantees it.
 *
 * Every read takes a `locale`, defaulting to Romanian, and the service returns
 * nothing rather than another language's copy. Ch. 09: "Nu schimbă limba pe
 * ascuns."
 */
@Controller("posts")
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  list(
    @Query("limit") limit?: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string,
    @Query("search") search?: string,
    @Query("tag") tag?: string,
    @Query("category") category?: string,
    @Query("goal") specialization?: string,
    @Query("locale") locale = "ro",
  ) {
    return this.blog.listPublished({
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
      perPage: perPage ? Number(perPage) : undefined,
      search,
      tag,
      category,
      specialization,
      locale,
      // The listing leads with whatever the editor pinned; the large tile in
      // the "latest news" block is the reason this exists.
      featuredFirst: true,
    });
  }

  /** Declared before `:slug`, or these are read as slugs. */
  @Get("slugs")
  slugs() {
    return this.blog.listPublishedSlugs();
  }

  @Get("tags")
  tags() {
    return this.blog.listTags();
  }

  /** Declared before `:slug` for the same reason as `slugs`. */
  @Get("categories")
  categories(@Query("locale") locale = "ro") {
    return this.blog.listCategoryCounts(locale);
  }

  @Get(":slug")
  bySlug(@Param("slug") slug: string, @Query("locale") locale = "ro") {
    return this.blog.findPublishedBySlug(slug, locale);
  }

  @Get(":slug/related")
  related(
    @Param("slug") slug: string,
    @Query("limit") limit?: string,
    @Query("locale") locale = "ro",
  ) {
    return this.blog.listRelated(slug, limit ? Number(limit) : 3, locale);
  }
}
