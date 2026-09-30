import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SubscriberEntity } from "@shared/entities";
import { paginate, searchTerm, type Paged } from "@shared/utils/paged";
import type { SubscribeDto, SubscriberQueryDto } from "./dto/subscribe.dto";

/**
 * The newsletter list.
 *
 * **Signing up twice is not an error.** A visitor who cannot remember whether
 * they subscribed will press the button again, and answering "that address is
 * taken" tells them something they should not have to care about — and leaks
 * whether an address is on the list. So a repeat sign-up quietly reactivates
 * the existing row and returns the same success either way.
 */
@Injectable()
export class NewsletterService {
  constructor(
    @InjectRepository(SubscriberEntity)
    private readonly subscribers: Repository<SubscriberEntity>,
  ) {}

  async subscribe(dto: SubscribeDto): Promise<{ ok: true }> {
    if (!dto.consent) {
      throw new BadRequestException("Este necesar acordul pentru prelucrarea datelor.");
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.subscribers.findOne({ where: { email } });

    if (existing) {
      // Reactivated, but the original consent date is kept: that is the date
      // the platform can point at, and rewriting it would overstate it.
      existing.status = "active";
      existing.unsubscribedAt = null;
      if (dto.name) existing.name = dto.name;
      await this.subscribers.save(existing);
      return { ok: true };
    }

    await this.subscribers.save(
      this.subscribers.create({
        email,
        name: dto.name ?? null,
        locale: dto.locale ?? "ro",
        source: dto.source ?? null,
        status: "active",
        consentedAt: new Date(),
      }),
    );

    return { ok: true };
  }

  // --- admin ---------------------------------------------------------------

  list(query: SubscriberQueryDto): Promise<Paged<SubscriberEntity>> {
    const builder = this.subscribers
      .createQueryBuilder("s")
      .orderBy("s.createdAt", "DESC")
      .addOrderBy("s.id", "DESC");

    if (query.status) builder.andWhere("s.status = :status", { status: query.status });

    const term = searchTerm(query.search);
    if (term) builder.andWhere("(s.email LIKE :term OR s.name LIKE :term)", { term });

    return paginate(builder, query);
  }

  /** How many are on the list right now, for the admin header. */
  async countActive(): Promise<number> {
    return this.subscribers.count({ where: { status: "active" } });
  }

  async unsubscribe(id: number): Promise<SubscriberEntity> {
    const found = await this.subscribers.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Subscriber ${id} not found`);

    found.status = "unsubscribed";
    found.unsubscribedAt = new Date();
    return this.subscribers.save(found);
  }

  /**
   * Hard delete, for an erasure request.
   *
   * Separate from unsubscribing on purpose: unsubscribing keeps the row so the
   * person stays opted out, and this is the one a GDPR request needs, where the
   * record itself has to go.
   */
  async remove(id: number): Promise<void> {
    const found = await this.subscribers.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Subscriber ${id} not found`);
    await this.subscribers.remove(found);
  }

  /** Every active address, for the export button. */
  listActiveForExport(): Promise<SubscriberEntity[]> {
    return this.subscribers.find({
      where: { status: "active" },
      order: { createdAt: "DESC" },
    });
  }
}
