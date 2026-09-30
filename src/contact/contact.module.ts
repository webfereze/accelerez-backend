import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { AuthModule } from "@auth/auth.module";
import { ContactService } from "./contact.service";
import { ContactController } from "./contact.controller";
import { AdminContactController } from "../admin/contact/admin-contact.controller";

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [ContactController, AdminContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
