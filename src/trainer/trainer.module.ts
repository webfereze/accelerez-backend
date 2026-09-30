import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { AuthModule } from "@auth/auth.module";
import { TrainerService } from "./trainer.service";
import { TrainerController } from "./trainer.controller";
import { AdminTrainerController } from "../admin/trainer/admin-trainer.controller";

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [TrainerController, AdminTrainerController],
  providers: [TrainerService],
  exports: [TrainerService],
})
export class TrainerModule {}
