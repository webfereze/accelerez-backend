import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Somebody who asked to hear from the platform.
 *
 * **The consent is the record.** `consentedAt` and `source` are not decoration:
 * under GDPR the platform has to be able to say when a person agreed and on
 * which page, and a list of addresses without that is a list they cannot
 * lawfully use. They are captured at sign-up and never updated.
 *
 * Unsubscribing **keeps the row** and clears `confirmedAt` instead of deleting
 * it. A deleted row is one that gets re-imported from an old spreadsheet next
 * year; a row that says "this person opted out" is a row that stays opted out.
 */
@Entity({ name: "subscribers" })
@Index(["status", "createdAt"])
export class SubscriberEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** Lowercased on the way in, so one person cannot subscribe twice. */
  @Index({ unique: true })
  @Column({ length: 200 })
  email: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  name: string | null;

  /** The locale they were reading when they signed up. */
  @Column({ type: "varchar", length: 5, default: "ro" })
  locale: string;

  /** Which page or block the sign-up came from. */
  @Column({ type: "varchar", length: 120, nullable: true })
  source: string | null;

  @Index()
  @Column({ type: "enum", enum: ["active", "unsubscribed"], default: "active" })
  status: "active" | "unsubscribed";

  /** When they ticked the box. Never rewritten. */
  @Column({ type: "datetime" })
  consentedAt: Date;

  @Column({ type: "datetime", nullable: true })
  unsubscribedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
