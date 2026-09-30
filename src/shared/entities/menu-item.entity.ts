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
import { MenuKey, MenuLinkType, SystemSection } from "@shared/enums/menu.enum";
import type { Translated } from "@shared/types/translated";
import { PageEntity } from "./page.entity";

/**
 * One entry in one of the site's menus.
 *
 * The menu is deliberately **not** derived from the page tree: an entry can
 * point at a page, at a built-in section (tours, booking, shop), or at an
 * external URL, and the same page may appear in more than one place. Pages are
 * content; menus are navigation.
 */
@Entity({ name: "menu_items" })
@Index(["menu", "parentId", "sortOrder"])
export class MenuItemEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** Which menu this belongs to. */
  @Index()
  @Column({ type: "enum", enum: MenuKey, default: MenuKey.MAIN })
  menu: MenuKey;

  /**
   * Overrides the linked page's title. Left empty, the page title is used — so
   * renaming a page renames its menu entry too.
   */
  @Column({ type: "json", nullable: true })
  label: Translated;

  @Column({ type: "enum", enum: MenuLinkType, default: MenuLinkType.PAGE })
  linkType: MenuLinkType;

  @ManyToOne(() => PageEntity, { nullable: true, onDelete: "CASCADE" })
  page: PageEntity;

  @Column({ nullable: true })
  pageId: number;

  /** Absolute URL, or a site-relative path. Used when `linkType` is `url`. */
  @Column({ type: "text", nullable: true })
  url: string;

  /** Which built-in section, when `linkType` is `system`. */
  @Column({ type: "enum", enum: SystemSection, nullable: true })
  systemKey: SystemSection;

  @Column({ default: false })
  openInNewTab: boolean;

  @ManyToOne(() => MenuItemEntity, (item) => item.children, {
    nullable: true,
    onDelete: "CASCADE",
  })
  parent: MenuItemEntity;

  @Column({ nullable: true })
  parentId: number;

  @OneToMany(() => MenuItemEntity, (item) => item.parent)
  children: MenuItemEntity[];

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  /** Hides an entry without deleting it — useful for seasonal links. */
  @Column({ default: true })
  isVisible: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
