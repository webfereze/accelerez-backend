import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { AuthModule } from "@auth/auth.module";
import { NewsletterService } from "./newsletter.service";
import { NewsletterController } from "./newsletter.controller";
import { AdminNewsletterController } from "../admin/newsletter/admin-newsletter.controller";

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [NewsletterController, AdminNewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
