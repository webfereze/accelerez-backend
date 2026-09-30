import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RequestStatus, Specialization } from "@shared/enums/accelerez.enum";

/**
 * Somebody who filled in the contact form.
 *
 * **The form is deliberately short.** Required: name, e-mail, a short message.
 * Optional: company, telephone, website, and which service they are interested
 * in — including "I don't know yet", which is why `goal` is nullable
 * rather than defaulted. It matters that a tax number, a
 * mandatory budget or a full brief have no place at first contact.
 *
 * **`sourceUrl` and `sourcePost` are hidden fields.** Ch. 09 asks that the
 * article a reader came from travels with the enquiry, so the reply can pick up
 * where they left off. They are captured, never shown to the sender.
 *
 * Messages are stored here and **not** sent to analytics — "textul
 * mesajelor nu intră în analitice".
 */
@Entity({ name: "contact_requests" })
@Index(["status", "createdAt"])
export class ContactRequestEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "varchar", length: 160 })
  name: string;

  @Column({ type: "varchar", length: 200 })
  email: string;

  @Column({ type: "text" })
  message: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  company: string | null;

  @Column({ type: "varchar", length: 60, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  website: string | null;

  /** Null means they chose "I don't know yet", which is a valid answer. */
  @Column({ type: "enum", enum: Specialization, nullable: true })
  goal: Specialization | null;

  /** The language they wrote in, so the reply matches. */
  @Column({ type: "varchar", length: 5, default: "ro" })
  locale: string;

  /** The page they submitted from. Hidden field. */
  @Column({ type: "varchar", length: 500, nullable: true })
  sourceUrl: string | null;

  /** The article that sent them, if any. Hidden field. */
  @Column({ type: "varchar", length: 200, nullable: true })
  sourcePost: string | null;

  @Index()
  @Column({ type: "enum", enum: RequestStatus, default: RequestStatus.NEW })
  status: RequestStatus;

  /** Internal note — who replied and what was agreed. Never public. */
  @Column({ type: "text", nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
