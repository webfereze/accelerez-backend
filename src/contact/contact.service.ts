import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ContactRequestEntity } from "@shared/entities";
import { RequestStatus } from "@shared/enums/accelerez.enum";
import { paginate, searchTerm, type Paged } from "@shared/utils/paged";
import type {
  ContactRequestQueryDto,
  CreateContactRequestDto,
  UpdateContactRequestDto,
} from "./dto/contact.dto";

/**
 * Enquiries from the contact form.
 *
 * **Stored, not e-mailed — yet.** There is no mail transport configured on this
 * project, and a form that appears to send while silently dropping the message
 * is the worst of the three options. The row is the record; wiring a
 * notification on top of it is a later, separate job.
 *
 * The message text never leaves this table: the product is explicit that it must not
 * go into analytics.
 */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectRepository(ContactRequestEntity)
    private readonly requests: Repository<ContactRequestEntity>,
  ) {}

  async submit(dto: CreateContactRequestDto): Promise<{ ok: true }> {
    // Honeypot: answer as though it worked. A bot told it failed is a bot that
    // tries again differently.
    if (dto.fax) {
      this.logger.warn("Contact form honeypot triggered — discarded");
      return { ok: true };
    }

    const { fax: _ignored, consent: _consent, ...fields } = dto;

    await this.requests.save(
      this.requests.create({
        ...(fields as Partial<ContactRequestEntity>),
        locale: dto.locale ?? "ro",
        status: RequestStatus.NEW,
      }),
    );

    // The address, not the message: enough to notice traffic, nothing that
    // belongs to the sender.
    this.logger.log(`Contact request from ${dto.email}`);

    return { ok: true };
  }

  // --- admin ---------------------------------------------------------------

  list(query: ContactRequestQueryDto): Promise<Paged<ContactRequestEntity>> {
    const builder = this.requests
      .createQueryBuilder("r")
      .orderBy("r.createdAt", "DESC")
      .addOrderBy("r.id", "DESC");

    if (query.status) builder.andWhere("r.status = :status", { status: query.status });

    const term = searchTerm(query.search);
    if (term) {
      builder.andWhere(
        "(r.name LIKE :term OR r.email LIKE :term OR r.company LIKE :term)",
        { term },
      );
    }

    return paginate(builder, query);
  }

  /** How many are still untouched, for the admin's dashboard. */
  countNew(): Promise<number> {
    return this.requests.count({ where: { status: RequestStatus.NEW } });
  }

  async findById(id: number): Promise<ContactRequestEntity> {
    const found = await this.requests.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Contact request ${id} not found`);
    return found;
  }

  async update(id: number, dto: UpdateContactRequestDto): Promise<ContactRequestEntity> {
    const found = await this.findById(id);
    Object.assign(found, dto);
    return this.requests.save(found);
  }

  /** For an erasure request. Ordinary triage marks the row, it does not delete. */
  async remove(id: number): Promise<void> {
    await this.requests.remove(await this.findById(id));
  }
}
