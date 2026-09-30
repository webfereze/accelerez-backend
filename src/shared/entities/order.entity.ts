import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { OrderStatus } from "@shared/enums/accelerez.enum";
import { decimalToNumber } from "@shared/utils/decimal";

/**
 * One line of an order: a product, one of its variants, how many — and what it
 * was called and cost at the moment of ordering.
 */
export type OrderLine = {
  productId: number;
  variantId: string;
  productTitle: string;
  /** Null when the product has a single variant: its name is never shown. */
  variantLabel: string | null;
  /** Null for "preț la cerere". */
  unitPrice: number | null;
  quantity: number;
  /** Whose product it was, so a coach can later see the lines that are theirs. */
  trainerId: number | null;
};

/**
 * Somebody checked out the cart.
 *
 * **Today an order is a reservation.** Nothing is charged: the row is placed,
 * somebody answers with the payment details, and the status is moved by hand.
 * The shape is already the one card payment needs — a reference to quote, a
 * price the server decided, a `paidAt` — so the payment arrives as a new way
 * of setting `PAID`, not as a new table.
 *
 * **What was ordered is copied, not only referenced.** The product can be
 * renamed, repriced or deleted after the fact; the order must still say what
 * this person asked for and at what price they were told. Each line keeps its
 * `productId` and `variantId` for the link back, and they may point at nothing.
 * The lines are JSON rather than a table for the reason the variants are: a
 * handful, only ever read with their order.
 *
 * The e-mail is where the plans are sent — "unde trimitem rezultatele" — which is
 * why it is required and the telephone is too: somebody who ordered a meal
 * plan and cannot be reached is an order that cannot be delivered.
 */
@Entity({ name: "orders" })
@Index(["status", "createdAt"])
export class OrderEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** "ACC-260924-7K3Q" — what the customer quotes on a transfer. */
  @Index({ unique: true })
  @Column({ type: "varchar", length: 20 })
  reference: string;

  /** What was ordered — copied, see the class note. At least one line. */
  @Column({ type: "json" })
  items: OrderLine[];

  /**
   * The sum of the priced lines, decided by the server. Null only when no
   * line has a price; `hasPriceOnRequest` says whether some line is missing
   * from it.
   */
  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalToNumber,
  })
  total: number | null;

  /** Some line was "preț la cerere" — the total is not the whole bill. */
  @Column({ type: "boolean", default: false })
  hasPriceOnRequest: boolean;

  @Column({ type: "char", length: 3, default: "RON" })
  currency: string;

  @Column({ type: "varchar", length: 160 })
  name: string;

  @Column({ type: "varchar", length: 200 })
  email: string;

  @Column({ type: "varchar", length: 60 })
  phone: string;

  /** Their goal, allergies, anything the plan should know. Optional. */
  @Column({ type: "text", nullable: true })
  message: string | null;

  /** The language they ordered in, so the reply and the plan match. */
  @Column({ type: "varchar", length: 5, default: "ro" })
  locale: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  sourceUrl: string | null;

  @Index()
  @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.NEW })
  status: OrderStatus;

  /** Set the moment it becomes `PAID`, by hand today. */
  @Column({ type: "datetime", nullable: true })
  paidAt: Date | null;

  /** Internal — who answered, what was agreed. Never shown to the customer. */
  @Column({ type: "text", nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
