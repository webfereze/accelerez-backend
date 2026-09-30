import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { AuthModule } from "@auth/auth.module";
import { TrainerModule } from "../trainer/trainer.module";
import { TrainingClassModule } from "../training-class/training-class.module";
import { AccessService } from "./access.service";
import { AgendaService } from "./agenda.service";
import { EnrollmentService } from "./enrollment.service";
import { MembershipService } from "./membership.service";
import { ResourceService } from "./resource.service";
import { ClientVideoService } from "./client-video.service";
import { ProgressService } from "./progress.service";
import { MessageService } from "./message.service";
import { PortalClientController } from "./client.controller";
import { PortalTrainerController } from "./trainer.controller";
import { AdminPortalController } from "../admin/portal/admin-portal.controller";

/**
 * The private half of the product: enrolments, months, material, videos.
 *
 * `TrainerModule` is imported rather than duplicated — the trainer's profile is
 * public content and belongs to that module; this one only ever reads it to
 * answer "who am I".
 */
@Module({
  imports: [SharedModule, AuthModule, TrainerModule, TrainingClassModule],
  controllers: [PortalClientController, PortalTrainerController, AdminPortalController],
  providers: [
    AccessService,
    AgendaService,
    EnrollmentService,
    MembershipService,
    ResourceService,
    ClientVideoService,
    ProgressService,
    MessageService,
  ],
  exports: [AccessService, EnrollmentService, MembershipService],
})
export class PortalModule {}
