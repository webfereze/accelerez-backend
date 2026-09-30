import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { Translated } from "@shared/types/translated";
import { TrainerEntity } from "./trainer.entity";

/**
 * Something a client actually said.
 *
 * **Attribution is required, not optional.** An unattributed quote is
 * indistinguishable from copywriting, so `author` and `role` are the fields
 * that make it evidence rather than decoration.
 *
 * `trainerId` is nullable because a client may endorse the platform rather than
 * one coach, but when it is set the quote appears on that trainer's profile —
 * which is where it does the most work, since choosing a trainer is the
 * decision the whole site exists to support.
 *
 * `approved` defaults to **false**: a quote is somebody else's words, and it
 * should take a deliberate act to publish them.
 */
@Entity({ name: "testimonials" })
@Index(["approved", "sortOrder"])
export class TestimonialEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "json" })
  quote: Translated;

  @Column({ type: "varchar", length: 160 })
  author: string;

  /** Their role — "manager", "proprietar". Without it the name means little. */
  @Column({ type: "varchar", length: 160, nullable: true })
  role: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  company: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  avatar: string | null;

  @Column({ nullable: true })
  trainerId: number | null;

  @ManyToOne(() => TrainerEntity, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "trainerId" })
  trainer: TrainerEntity | null;

  /** Deliberate act — see the class note. */
  @Index()
  @Column({ type: "boolean", default: false })
  approved: boolean;

  /** Shown on the home page rather than only on the trainer's profile. */
  @Column({ type: "boolean", default: false })
  isFeatured: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
