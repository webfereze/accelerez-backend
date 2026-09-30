import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Small pieces of site-wide content that aren't a page: the footer, contact
 * details, and whatever comes next.
 *
 * Key/value with a JSON body on purpose — "the footer needs one more field"
 * must not mean a schema migration on a live site.
 */
@Entity({ name: "site_settings" })
export class SiteSettingEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** e.g. `footer`. */
  @Index({ unique: true })
  @Column({ length: 80 })
  key: string;

  @Column({ type: "json" })
  value: Record<string, unknown>;

  @UpdateDateColumn()
  updatedAt: Date;
}
