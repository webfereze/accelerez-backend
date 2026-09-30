import { Module } from "@nestjs/common";
import { AuthModule } from "@auth/auth.module";
import { UploadService } from "./upload.service";
import { PortalUploadController, UploadController } from "./upload.controller";

@Module({
  imports: [AuthModule],
  controllers: [UploadController, PortalUploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
