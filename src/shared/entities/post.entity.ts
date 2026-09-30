import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Translated } from "@shared/types/translated";
import { PageStatus } from "@shared/enums/page-status.enum";
import { BlogCategory, Specialization } from "@shared/enums/accelerez.enum";
import type { PublishedLocales } from "@shared/types/locales";

/**
 * An article on the blog.
 *
 * Its own entity rather than a content page for one reason: **order in time**.
 * A page sits where an editor puts it in a tree; an article is newest-first
 * forever, appears in a feed, carries an author and a date somebody reads, and
 * is listed in reverse chronological order by machines as well as people. A
 * page with a date field is a blog that cannot be sorted.
 *
 * `publishedAt` is the date the article is *of* and what the ordering uses. It
 * is set when the article is first published and then left alone, so correcting
 * a typo next year does not jump a two-year-old piece to the top of the list.
 *
 * The body is blocks, like everything else here, so an article can carry a
 * gallery or a call to action rather than only prose.
 */
@Entity({ name: "posts" })
@Index(["status", "publishedAt"])
export class PostEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /**
   * A URL segment per language ("titlu și URL" per language).
   *
   * Not a unique index: uniqueness here is *per language*, and `contact` in
   * Romanian and `contact` in English are different addresses that may coexist.
   * A column-level unique constraint on the whole JSON object would allow
   * neither — see `assertLocalizedSlugFree`.
   */
  @Column({ type: "json" })
  slug: Translated;

  @Column({ type: "json" })
  title: Translated;

  /** One or two sentences, for a card and for the share preview. */
  @Column({ type: "json", nullable: true })
  excerpt: Translated;

  @Column({ type: "json", nullable: true })
  content: unknown[];

  @Column({ type: "varchar", length: 500, nullable: true })
  coverImage: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  coverAlt: string | null;

  /**
   * A name, not a user id.
   *
   * Articles are frequently written by someone who will never have an account —
   * a guest coach, a dietitian, a physiotherapist — and a foreign key would
   * mean inventing a login for each of them. When real authorship is wanted
   * this becomes a relation; until then a name is the honest shape.
   */
  @Column({ type: "varchar", length: 160, nullable: true })
  author: string | null;

  /**
   * The author's role ("autor real și rol").
   *
   * A name alone does not tell a reader why this person's view is worth
   * anything; the role is what makes the byline evidence rather than decoration.
   */
  @Column({ type: "json", nullable: true })
  authorRole: Translated;

  /**
   * The one category the article belongs to.
   *
   * Exactly one, from a closed list of five, each answering a client question
   * and pointing at services. It matters that empty categories
   * must not be shown, which only works if the set is closed.
   */
  @Index()
  @Column({ type: "enum", enum: BlogCategory, nullable: true })
  category: BlogCategory | null;

  /**
   * Which goals the article speaks to — deliberately **not** a second category.
   *
   * An article has exactly one category and any number of these, so "cum
   * slăbești fără să pierzi masă musculară" can surface for two goals at once
   * without existing twice.
   */
  @Column({ type: "json", nullable: true })
  specializations: Specialization[];

  /** Free tags, alongside the closed sets above. */
  @Column({ type: "json", nullable: true })
  tags: string[];

  /** Lifts one article to the top of the listing and into the large tile. */
  @Index()
  @Column({ type: "boolean", default: false })
  isFeatured: boolean;

  /** Minutes. Null hides the estimate rather than printing "0 min". */
  @Column({ type: "smallint", nullable: true })
  readingMinutes: number | null;

  @Index()
  @Column({ type: "enum", enum: PageStatus, default: PageStatus.DRAFT })
  status: PageStatus;

  /**
   * Set on first publish and then left alone — see the class note. Null while
   * the article has never been published.
   */
  @Index()
  @Column({ type: "datetime", nullable: true })
  publishedAt: Date | null;

  /**
   * When the article was last **substantively** revised.
   *
   * Deliberately not `updatedAt`: fixing a typo is not a revision, and showing
   * a freshness date that moves every time somebody opens the editor is a date
   * that means nothing. The editor sets this on purpose.
   */
  @Column({ type: "datetime", nullable: true })
  contentUpdatedAt: Date | null;

  /** Trainers worth reading this next to — at most two, or it is a listing. */
  @Column({ type: "json", nullable: true })
  relatedTrainerIds: number[];

  /** At most two related articles, by rule. */
  @Column({ type: "json", nullable: true })
  relatedPostIds: number[];

  /**
   * The closing call to action. `ctaHref` is where it goes — usually the
   * trainer directory filtered by this article's goal.
   */
  @Column({ type: "json", nullable: true })
  ctaLabel: Translated;

  @Column({ type: "varchar", length: 300, nullable: true })
  ctaHref: string | null;

  /** See `PublishedLocales` — this product forbids silent fallback. */
  @Column({ type: "json", nullable: true })
  publishedLocales: PublishedLocales;

  @Column({ type: "json", nullable: true })
  seoTitle: Translated;

  @Column({ type: "json", nullable: true })
  seoDescription: Translated;

  @Column({ type: "boolean", default: false })
  noindex: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
