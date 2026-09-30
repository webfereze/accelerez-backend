import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { NewsletterService } from "./newsletter.service";
import { SubscribeDto } from "./dto/subscribe.dto";

/**
 * Public sign-up.
 *
 * **Rate limited.** It is an unauthenticated write that creates a row, which is
 * exactly the shape a script enumerates. Five attempts a minute is generous for
 * a person and useless for a bot.
 */
@Controller("newsletter")
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("subscribe")
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletter.subscribe(dto);
  }
}
