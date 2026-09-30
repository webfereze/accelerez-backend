import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { Translated } from "@shared/types/translated";

/**
 * A question asked often enough to answer on the page.
 *
 * A row rather than an accordion block inside a page body, because the same
 * question belongs on the home page, the pricing section and the trainer
 * directory at once, and because the answers are the kind of text somebody
 * should be able to correct without opening a page builder.
 *
 * `topic` groups them loosely — free text, because the groups change with the
 * marketing and nothing joins on it.
 */
@Entity({ name: "faqs" })
@Index(["topic", "sortOrder"])
export class FaqEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "json" })
  question: Translated;

  /** Rich text — answers routinely need a list or a link. */
  @Column({ type: "json" })
  answer: Translated;

  @Column({ type: "varchar", length: 60, nullable: true })
  topic: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @Column({ type: "boolean", default: true })
  isVisible: boolean;
}
