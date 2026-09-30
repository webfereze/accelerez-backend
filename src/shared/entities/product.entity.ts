import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Translated } from "@shared/types/translated";
import type { PublishedLocales } from "@shared/types/locales";
import { PageStatus } from "@shared/enums/page-status.enum";
import { ProductCategory } from "@shared/enums/accelerez.enum";

/**
 * One way to buy a product: "1 lună", "3 luni", "Acasă", "Sală".
 *
 * **The id is stable and is what an order points at.** Labels get reworded and
 * prices change; an order placed last month still has to say what it was for,
 * which is why the order also keeps a copy of the label and the price.
 *
 * `price` may be empty — "preț la cerere" — because a coach may sell something
 * whose price depends on the conversation. It is `null`, never `0`: nothing on
 * this site is free by accident.
 */
export type ProductVariant = {
  id: string;
  label: Translated;
  price: number | null;
  /** The struck-through figure beside the price during an offer. */
  compareAtPrice: number | null;
};

/**
 * Something the shop sells: a meal plan, a training programme, a recipe book.
 *
 * **Not a class and not a coaching month.** A class is something you turn up
 * to and a coaching month is access to a person; a product is a thing that is
 * delivered — usually a document, made for you or ready-made. It gets its own
 * table rather than a "kind" column on classes because none of a class's
 * fields (a schedule, a place, a capacity) mean anything here.
 *
 * **Variants are a JSON column, not a table.** There are two or four of them,
 * they are only ever read with their product, and they are edited as one list.
 *
 * **The price the server charges is read from here, never from the order
 * form.** Today nothing is charged — an order is a reservation — but the day
 * card payment arrives the form's figure must already be irrelevant.
 */
@Entity({ name: "products" })
@Index(["status", "sortOrder"])
export class ProductEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "json" })
  slug: Translated;

  @Column({ type: "json" })
  title: Translated;

  @Index()
  @Column({ type: "enum", enum: ProductCategory, default: ProductCategory.OTHER })
  category: ProductCategory;

  /** The two or three lines on the card. */
  @Column({ type: "json", nullable: true })
  excerpt: Translated;

  /** The long description, as blocks — same as a class page. */
  @Column({ type: "json", nullable: true })
  content: unknown[];

  @Column({ type: "varchar", length: 500, nullable: true })
  image: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  imageAlt: string | null;

  /** At least one. See `ProductVariant`. */
  @Column({ type: "json" })
  variants: ProductVariant[];

  @Column({ type: "char", length: 3, default: "RON" })
  currency: string;

  /** "Primești planul pe e-mail în 48 de ore." Shown beside the order form. */
  @Column({ type: "json", nullable: true })
  deliveryNote: Translated;

  /** The corner ribbon — "Nou", "-20%". Empty is the normal state. */
  @Column({ type: "json", nullable: true })
  ribbon: Translated;

  /** Whose product it is. Null for one the platform sells as a whole. */
  @Column({ type: "int", nullable: true })
  trainerId: number | null;

  @Index()
  @Column({ type: "enum", enum: PageStatus, default: PageStatus.DRAFT })
  status: PageStatus;

  /** Lifts it onto the home page. */
  @Index()
  @Column({ type: "boolean", default: false })
  isFeatured: boolean;

  @Column({ type: "json", nullable: true })
  publishedLocales: PublishedLocales;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

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
