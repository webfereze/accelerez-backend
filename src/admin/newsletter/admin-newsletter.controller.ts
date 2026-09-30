import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { StaffGuard } from "@auth/guards/staff.guard";
import { NewsletterService } from "../../newsletter/newsletter.service";
import { SubscriberQueryDto } from "../../newsletter/dto/subscribe.dto";

@UseGuards(JwtAuthGuard, StaffGuard)
@Controller("admin/subscribers")
export class AdminNewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Get()
  list(@Query() query: SubscriberQueryDto) {
    return this.newsletter.list(query);
  }

  /** Declared before `:id`, or "export" is read as an id. */
  @Get("export")
  async exportAll() {
    const rows = await this.newsletter.listActiveForExport();

    // Returned as rows rather than as a CSV string: the admin builds the file
    // in the browser, so there is no second format to keep in step and no
    // encoding argument about which separator Excel expects this week.
    return rows.map((row) => ({
      email: row.email,
      name: row.name,
      locale: row.locale,
      source: row.source,
      consentedAt: row.consentedAt,
    }));
  }

  @Patch(":id/unsubscribe")
  unsubscribe(@Param("id", ParseIntPipe) id: number) {
    return this.newsletter.unsubscribe(id);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.newsletter.remove(id);
  }
}
