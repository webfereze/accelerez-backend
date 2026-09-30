import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PageLayout } from "@shared/enums/page-layout.enum";
import { PageStatus } from "@shared/enums/page-status.enum";
import type { Translated } from "@shared/types/translated";
import type { Block } from "@shared/types/blocks";
import { UserEntity } from "./user.entity";

/**
 * A content page on the public site, assembled from blocks.
 *
 * Pages nest one level (parent → child). They are deliberately **not** the
 * navigation menu: a page can sit outside it, and a menu entry can point at
 * something that is not a page (a tour, the booking flow, an external link).
 */
@Entity({ name: "pages" })
@Index(["status", "parentId"])
export class PageEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /**
   * URL segment, shared across locales — one stable slug, so a page's URL never
   * changes when a translation is added.
   */
  @Index({ unique: true })
  @Column({ length: 200 })
  slug: string;

  /** Translatable — `{ hu, ro, en, da }`. */
  @Column({ type: "json" })
  title: Translated;

  /** Short intro shown under the page title. */
  @Column({ type: "json", nullable: true })
  excerpt: Translated;

  /** The page body: an ordered list of typed blocks. */
  @Column({ type: "json", nullable: true })
  content: Block[];

  @Column({ type: "enum", enum: PageLayout, default: PageLayout.FULL })
  layout: PageLayout;

  /**
   * Blocks for the side column. Only rendered under the `sidebar` layout, but
   * kept when the layout is switched back — an editor who tries the other
   * layout and returns should not find their sidebar deleted.
   */
  @Column({ type: "json", nullable: true })
  sidebar: Block[];

  @ManyToOne(() => PageEntity, (page) => page.children, {
    nullable: true,
    onDelete: "RESTRICT",
  })
  parent: PageEntity;

  @Column({ nullable: true })
  parentId: number;

  @OneToMany(() => PageEntity, (page) => page.parent)
  children: PageEntity[];

  @Index()
  @Column({ type: "enum", enum: PageStatus, default: PageStatus.DRAFT })
  status: PageStatus;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  /**
   * Exactly one page is the site's front page, served at `/`. `PageService`
   * clears the flag on every other page when one is set, so this can never be
   * true for two rows at once.
   */
  @Index()
  @Column({ default: false })
  isHomepage: boolean;

  // --- SEO ---------------------------------------------------------------

  @Column({ type: "json", nullable: true })
  seoTitle: Translated;

  @Column({ type: "json", nullable: true })
  seoDescription: Translated;

  /** Keeps a page out of search engines without unpublishing it. */
  @Column({ default: false })
  noindex: boolean;

  @Column({ type: "datetime", nullable: true })
  publishedAt: Date;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: "SET NULL" })
  updatedBy: UserEntity;

  @Column({ nullable: true })
  updatedById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
