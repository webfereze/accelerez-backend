import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { AuthModule } from "@auth/auth.module";
import { TrainingClassService } from "./training-class.service";
import { ClassMemberService } from "./class-member.service";
import { TrainingClassController } from "./training-class.controller";
import { AdminTrainingClassController } from "../admin/training-class/admin-training-class.controller";

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [TrainingClassController, AdminTrainingClassController],
  providers: [TrainingClassService, ClassMemberService],
  exports: [TrainingClassService, ClassMemberService],
})
export class TrainingClassModule {}
