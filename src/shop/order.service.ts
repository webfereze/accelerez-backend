import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomInt } from "crypto";
import { Repository } from "typeorm";
import { OrderEntity } from "@shared/entities";
import type { OrderLine } from "@shared/entities/order.entity";
import { OrderStatus } from "@shared/enums/accelerez.enum";
import { LOCALES, pick, type Locale } from "@shared/types/translated";
import { paginate, searchTerm, type Paged } from "@shared/utils/paged";
import { ProductService } from "./product.service";
import type {
  CartLineDto,
  CreateOrderDto,
  OrderQueryDto,
  QuoteDto,
  UpdateOrderDto,
} from "./dto/order.dto";

/** A cart line as the shop prices it now. */
export type QuotedLine = OrderLine & {
  slug: string | null;
  image: string | null;
  compareAtPrice: number | null;
  /** Null when the line is "preț la cerere". */
  lineTotal: number | null;
};

/** The cart, priced by the server. */
export type Quote = {
  lines: QuotedLine[];
  /** Lines that can no longer be bought — unpublished, deleted, variant gone. */
  unavailable: Array<{ productId: number; variantId: string }>;
  total: number | null;
  hasPriceOnRequest: boolean;
  currency: string;
};

/** What the customer is shown once the order is in. */
export type OrderReceipt = {
  reference: string;
  lines: OrderLine[];
  total: number | null;
  hasPriceOnRequest: boolean;
  currency: string;
};

/** No 0/O, 1/I/L: a reference is read aloud over the phone and typed into a bank app. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * The cart and the orders it becomes.
 *
 * **The cart lives in the browser; its prices never do.** The browser keeps
 * which products, which variants and how many. `quote` turns that into lines
 * with today's names and prices, and `submit` does the same again at the
 * moment of ordering and stores the result — so a price changed in the admin
 * while somebody's cart was open is the price they are shown and the price on
 * their order, and no request can name its own.
 *
 * **Stored, not e-mailed — yet**, like the contact form: there is no mail
 * transport on this project. The admin's list is the inbox.
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
    private readonly products: ProductService,
  ) {}

  /** Read-only. What the cart drawer and the checkout page show. */
  async quote(dto: QuoteDto): Promise<Quote> {
    const locale = this.localeOf(dto.locale);
    const lines: QuotedLine[] = [];
    const unavailable: Quote["unavailable"] = [];

    for (const item of this.merge(dto.items)) {
      try {
        lines.push(await this.price(item, locale));
      } catch (error) {
        if (!(error instanceof NotFoundException)) throw error;
        unavailable.push({ productId: item.productId, variantId: item.variantId });
      }
    }

    return { lines, unavailable, ...this.totals(lines) };
  }

  async submit(dto: CreateOrderDto): Promise<OrderReceipt> {
    const locale = this.localeOf(dto.locale);

    // Every line priced now, and all of them or none: an order silently
    // missing the product that was unpublished a minute ago is an order for
    // something the customer did not ask for.
    const lines = await Promise.all(this.merge(dto.items).map((item) => this.price(item, locale)));

    const totals = this.totals(lines);
    if (new Set(lines.map((line) => line.currency)).size > 1) {
      throw new BadRequestException("Produsele din coș au monede diferite.");
    }

    const stored: OrderLine[] = lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      productTitle: line.productTitle,
      variantLabel: line.variantLabel,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      trainerId: line.trainerId,
    }));

    const receipt: OrderReceipt = {
      reference: this.newReference(),
      lines: stored,
      total: totals.total,
      hasPriceOnRequest: totals.hasPriceOnRequest,
      currency: totals.currency,
    };

    // Honeypot: answer exactly as though it worked — see the contact form.
    if (dto.fax) {
      this.logger.warn("Order form honeypot triggered — discarded");
      return receipt;
    }

    // A reference is random, so it can collide; the unique index is the
    // judge. Three attempts in a space of 31⁴ per day is not a loop that runs.
    for (let attempt = 0; ; attempt++) {
      try {
        await this.orders.insert({
          reference: receipt.reference,
          items: stored,
          total: receipt.total,
          hasPriceOnRequest: receipt.hasPriceOnRequest,
          currency: receipt.currency,
          name: dto.name.trim(),
          email: dto.email,
          phone: dto.phone.trim(),
          message: dto.message?.trim() || null,
          locale,
          sourceUrl: dto.sourceUrl ?? null,
          status: OrderStatus.NEW,
        });
        break;
      } catch (error) {
        if ((error as { code?: string }).code !== "ER_DUP_ENTRY" || attempt >= 2) throw error;
        receipt.reference = this.newReference();
      }
    }

    // The reference and the address — nothing the customer wrote.
    this.logger.log(`Order ${receipt.reference} from ${dto.email}`);
    return receipt;
  }

  // --- admin ---------------------------------------------------------------

  list(query: OrderQueryDto): Promise<Paged<OrderEntity>> {
    const builder = this.orders
      .createQueryBuilder("o")
      .orderBy("o.createdAt", "DESC")
      .addOrderBy("o.id", "DESC");

    if (query.status) builder.andWhere("o.status = :status", { status: query.status });

    const term = searchTerm(query.search);
    if (term) {
      // `items` is searched as text: the product names are in it, and this is
      // a find-my-order box, not a report.
      builder.andWhere(
        "(o.name LIKE :term OR o.email LIKE :term OR o.phone LIKE :term OR o.reference LIKE :term OR CAST(o.items AS CHAR) LIKE :term)",
        { term },
      );
    }

    return paginate(builder, query);
  }

  countNew(): Promise<number> {
    return this.orders.count({ where: { status: OrderStatus.NEW } });
  }

  async findById(id: number): Promise<OrderEntity> {
    const found = await this.orders.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Order ${id} not found`);
    return found;
  }

  async update(id: number, dto: UpdateOrderDto): Promise<OrderEntity> {
    const found = await this.findById(id);

    if (dto.status !== undefined) {
      // The first time it is marked paid is when it was paid. Moving it on to
      // "delivered" keeps that date; moving it back before "paid" clears it.
      if (dto.status === OrderStatus.PAID || dto.status === OrderStatus.DELIVERED) {
        found.paidAt ??= dto.status === OrderStatus.PAID ? new Date() : null;
      } else {
        found.paidAt = null;
      }
      found.status = dto.status;
    }
    if (dto.note !== undefined) found.note = dto.note || null;

    return this.orders.save(found);
  }

  /** For an erasure request. Ordinary work moves the status. */
  async remove(id: number): Promise<void> {
    await this.orders.remove(await this.findById(id));
  }

  // --- internals -----------------------------------------------------------

  /** One line with today's name and price, or 404 if it cannot be bought. */
  private async price(item: CartLineDto, locale: Locale): Promise<QuotedLine & { currency: string }> {
    const { product, variant } = await this.products.findOrderable(item.productId, item.variantId);
    const unitPrice = variant.price ?? null;

    return {
      productId: product.id,
      variantId: variant.id,
      productTitle: pick(product.title, locale),
      // A single variant's name is never shown on the site, so it is not
      // shown on the order either.
      variantLabel: product.variants.length > 1 ? pick(variant.label, locale) || null : null,
      unitPrice,
      quantity: item.quantity,
      trainerId: product.trainerId ?? null,
      slug: (product.slug as Record<string, string | undefined>)?.[locale] ?? product.slug?.ro ?? null,
      image: product.image,
      compareAtPrice: variant.compareAtPrice ?? null,
      lineTotal: unitPrice == null ? null : unitPrice * item.quantity,
      currency: product.currency,
    };
  }

  /** The same product and variant twice is one line with the quantities added. */
  private merge(items: CartLineDto[]): CartLineDto[] {
    const byKey = new Map<string, CartLineDto>();
    for (const item of items) {
      const key = `${item.productId}:${item.variantId}`;
      const seen = byKey.get(key);
      byKey.set(key, {
        ...item,
        quantity: Math.min(10, (seen?.quantity ?? 0) + item.quantity),
      });
    }
    return [...byKey.values()];
  }

  private totals(lines: Array<QuotedLine & { currency?: string }>) {
    const priced = lines.filter((line) => line.lineTotal != null);
    return {
      total: priced.length ? priced.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0) : null,
      hasPriceOnRequest: priced.length < lines.length,
      currency: lines[0]?.currency ?? "RON",
    };
  }

  /** A language the site does not speak is read as Romanian, not stored. */
  private localeOf(value: string | undefined): Locale {
    return (LOCALES as readonly string[]).includes(value ?? "") ? (value as Locale) : "ro";
  }

  private newReference(): string {
    const now = new Date();
    const date = [now.getFullYear() % 100, now.getMonth() + 1, now.getDate()]
      .map((part) => String(part).padStart(2, "0"))
      .join("");
    const tail = Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    return `ACC-${date}-${tail}`;
  }
}
