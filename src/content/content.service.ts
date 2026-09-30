import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FaqEntity, TestimonialEntity } from "@shared/entities";
import { normalize } from "@shared/types/translated";
import type { UpsertFaqDto, UpsertTestimonialDto } from "./dto/content.dto";

/**
 * The two small collections the marketing pages are built from: questions and
 * quotes.
 *
 * One service for both because they are the same shape of work — a short list,
 * ordered by hand, with a visibility flag — and two services with one method
 * each is ceremony. They separate the moment either grows a query of its own.
 */
@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(FaqEntity)
    private readonly faqs: Repository<FaqEntity>,
    @InjectRepository(TestimonialEntity)
    private readonly testimonials: Repository<TestimonialEntity>,
  ) {}

  // --- FAQ -----------------------------------------------------------------

  listFaqs(topic?: string): Promise<FaqEntity[]> {
    return this.faqs.find({
      where: topic ? { isVisible: true, topic } : { isVisible: true },
      order: { sortOrder: "ASC", id: "ASC" },
    });
  }

  /** Drafts included — the admin list. */
  listAllFaqs(): Promise<FaqEntity[]> {
    return this.faqs.find({ order: { sortOrder: "ASC", id: "ASC" } });
  }

  async findFaq(id: number): Promise<FaqEntity> {
    const row = await this.faqs.findOne({ where: { id } });
    if (!row) throw new NotFoundException("Întrebarea nu există.");
    return row;
  }

  createFaq(dto: UpsertFaqDto): Promise<FaqEntity> {
    return this.faqs.save(this.faqs.create(this.faqFields(dto)));
  }

  async updateFaq(id: number, dto: UpsertFaqDto): Promise<FaqEntity> {
    const row = await this.findFaq(id);
    Object.assign(row, this.faqFields(dto));
    return this.faqs.save(row);
  }

  async removeFaq(id: number): Promise<void> {
    await this.findFaq(id);
    await this.faqs.delete(id);
  }

  // --- testimonials --------------------------------------------------------

  /** Approved only — see the entity. `trainerId` narrows to one profile. */
  listTestimonials(options: { trainerId?: number; featuredOnly?: boolean } = {}) {
    const where: Record<string, unknown> = { approved: true };
    if (options.trainerId) where.trainerId = options.trainerId;
    if (options.featuredOnly) where.isFeatured = true;

    return this.testimonials.find({
      where,
      order: { sortOrder: "ASC", id: "DESC" },
    });
  }

  listAllTestimonials(): Promise<TestimonialEntity[]> {
    return this.testimonials.find({ order: { sortOrder: "ASC", id: "DESC" } });
  }

  async findTestimonial(id: number): Promise<TestimonialEntity> {
    const row = await this.testimonials.findOne({ where: { id } });
    if (!row) throw new NotFoundException("Testimonialul nu există.");
    return row;
  }

  createTestimonial(dto: UpsertTestimonialDto): Promise<TestimonialEntity> {
    return this.testimonials.save(this.testimonials.create(this.testimonialFields(dto)));
  }

  async updateTestimonial(id: number, dto: UpsertTestimonialDto): Promise<TestimonialEntity> {
    const row = await this.findTestimonial(id);
    Object.assign(row, this.testimonialFields(dto));
    return this.testimonials.save(row);
  }

  async removeTestimonial(id: number): Promise<void> {
    await this.findTestimonial(id);
    await this.testimonials.delete(id);
  }

  // --- internals -----------------------------------------------------------

  private faqFields(dto: UpsertFaqDto) {
    return {
      question: normalize(dto.question),
      answer: normalize(dto.answer),
      topic: dto.topic ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isVisible: dto.isVisible ?? true,
    };
  }

  private testimonialFields(dto: UpsertTestimonialDto) {
    return {
      quote: normalize(dto.quote),
      author: dto.author.trim(),
      role: dto.role ?? null,
      company: dto.company ?? null,
      avatar: dto.avatar ?? null,
      trainerId: dto.trainerId ?? null,
      approved: dto.approved ?? false,
      isFeatured: dto.isFeatured ?? false,
      sortOrder: dto.sortOrder ?? 0,
    };
  }
}
