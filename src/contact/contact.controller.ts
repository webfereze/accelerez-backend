import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ContactService } from "./contact.service";
import { CreateContactRequestDto } from "./dto/contact.dto";

/**
 * Public submission.
 *
 * **Rate limited.** It is an unauthenticated write that creates a row, which is
 * exactly the shape a script abuses. Five a minute is generous for a person
 * and useless for a bot; the honeypot in the DTO catches the rest.
 */
@Controller("contact")
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("requests")
  submit(@Body() dto: CreateContactRequestDto) {
    return this.contact.submit(dto);
  }
}
