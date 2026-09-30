import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { PageService } from "./page.service";

/**
 * Public read API. Anonymous, cacheable, published content only — the admin
 * surface lives at `/admin/pages` behind a guard, and the public site never
 * calls it.
 */
@Controller("pages")
export class PageController {
  constructor(private readonly pages: PageService) {}

  /** GET /pages/slugs → every published slug, for getStaticPaths + sitemap. */
  @Get("slugs")
  slugs() {
    return this.pages.listPublishedSlugs();
  }

  /** GET /pages/home → the page flagged as the front page. */
  @Get("home")
  async home() {
    const page = await this.pages.findHomepage();
    if (!page) throw new NotFoundException("No homepage has been set.");
    return page;
  }

  /** GET /pages/:slug → one published page with its blocks. */
  @Get(":slug")
  bySlug(@Param("slug") slug: string) {
    return this.pages.findPublishedBySlug(slug);
  }
}
