import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ProductService } from "./product.service";
import { OrderService } from "./order.service";
import { ProductQueryDto } from "./dto/product.dto";
import { CreateOrderDto, QuoteDto } from "./dto/order.dto";

/** The public shop: the products, and the order form behind each one. */
@Controller()
export class ShopController {
  constructor(
    private readonly products: ProductService,
    private readonly orders: OrderService,
  ) {}

  @Get("products")
  list(@Query() query: ProductQueryDto) {
    return this.products.listPublished(query);
  }

  /** Declared before `:slug`, or "slugs" is read as somebody's slug. */
  @Get("products/slugs")
  slugs() {
    return this.products.listPublishedSlugs();
  }

  @Get("products/:slug")
  detail(@Param("slug") slug: string, @Query("locale") locale = "ro") {
    return this.products.findBySlug(slug, locale);
  }

  /**
   * The cart, priced. A POST because the cart is a body, not a query — but it
   * writes nothing, so it gets a looser limit than placing an order.
   */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post("orders/quote")
  @HttpCode(200)
  quote(@Body() dto: QuoteDto) {
    return this.orders.quote(dto);
  }

  /** An unauthenticated write that creates a row — limited like the contact form. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("orders")
  order(@Body() dto: CreateOrderDto) {
    return this.orders.submit(dto);
  }
}
