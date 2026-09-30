import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { ClientGuard } from "@auth/guards/client.guard";
import { CurrentUser } from "@auth/decorators/current-user.decorator";
import { UserEntity } from "@shared/entities";
import { EnrollmentService } from "./enrollment.service";
import { MembershipService } from "./membership.service";
import { ResourceService } from "./resource.service";
import { ClientVideoService } from "./client-video.service";
import { ProgressService } from "./progress.service";
import { MessageService } from "./message.service";
import { ClassMemberService } from "../training-class/class-member.service";
import { TrainingClassService } from "../training-class/training-class.service";
import { JoinClassDto } from "../training-class/dto/training-class.dto";
import {
  CreateClientVideoDto,
  EnrollDto,
  SendMessageDto,
  UpsertProgressDto,
  VideoCommentDto,
} from "./dto/portal.dto";

/**
 * The client's own area.
 *
 * **Every route resolves the enrolment through the signed-in client**, never
 * from the id alone — `findForClient` filters on both — so an id guessed in a
 * URL returns 404 rather than somebody else's training plan.
 *
 * The material routes are paywalled inside the services, not here: the check
 * belongs next to the query it guards, or the eleventh endpoint is the one that
 * forgets it.
 */
@UseGuards(JwtAuthGuard, ClientGuard)
@Controller("portal/client")
export class PortalClientController {
  constructor(
    private readonly enrollments: EnrollmentService,
    private readonly memberships: MembershipService,
    private readonly resources: ResourceService,
    private readonly videos: ClientVideoService,
    private readonly progress: ProgressService,
    private readonly messages: MessageService,
    private readonly classes: ClassMemberService,
    private readonly publicClasses: TrainingClassService,
  ) {}

  /** Everything the dashboard needs in one call, access state included. */
  @Get("overview")
  overview(@CurrentUser() user: UserEntity) {
    return this.enrollments.listForClient(user.id);
  }

  @Post("enroll")
  enroll(@CurrentUser() user: UserEntity, @Body() dto: EnrollDto) {
    return this.enrollments.enroll(user.id, dto);
  }

  @Get("enrollments/:id")
  enrollment(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    return this.enrollments.viewForClient(user.id, id);
  }

  /** The payment history of their own enrolment — months, amounts, dates. */
  @Get("enrollments/:id/periods")
  async periods(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.memberships.list(enrollment.id);
  }

  @Get("enrollments/:id/resources")
  async resourceList(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.resources.listForClient(enrollment);
  }

  @Get("enrollments/:id/resources/:resourceId")
  async resource(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Param("resourceId", ParseIntPipe) resourceId: number,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.resources.openForClient(enrollment, resourceId);
  }

  @Get("enrollments/:id/videos")
  async videoList(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.videos.listForClient(enrollment);
  }

  /**
   * The file itself is uploaded first, through `POST /upload/video`, and this
   * records what came back. Two steps rather than one multipart request,
   * because an upload that fails halfway should not take the note and the title
   * with it.
   */
  @Post("enrollments/:id/videos")
  async createVideo(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: CreateClientVideoDto,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.videos.create(enrollment, dto);
  }

  // --- classes -------------------------------------------------------------

  /**
   * The classes this client is in, soonest first.
   *
   * **Not behind the paid month.** A class is paid for with the coach who runs
   * it, the same way the 1:1 side is, and a group session is not something the
   * 1:1 paywall has any business closing — somebody can be between periods with
   * one trainer and still have Tuesday's boxing class.
   */
  @Get("classes")
  classList(@CurrentUser() user: UserEntity) {
    return this.classes.listForClient(user.id);
  }

  /**
   * Whether this client has been accepted by one of a class's coaches.
   *
   * Joining is open to anybody with an account; this is what decides whether
   * they get the way in. The panel needs it to say "ask this coach first" and
   * to name one.
   */
  @Get("classes/:classId/eligibility")
  async classEligibility(
    @CurrentUser() user: UserEntity,
    @Param("classId", ParseIntPipe) classId: number,
  ) {
    const trainingClass = await this.publicClasses.findByIdPublic(classId);
    const accepted = await this.classes.acceptedTrainersFor(
      user.id,
      trainingClass.trainerIds ?? [],
    );

    return {
      accepted: accepted.length > 0,
      acceptedTrainerIds: accepted,
      trainerIds: trainingClass.trainerIds ?? [],
    };
  }

  @Post("classes/:classId/join")
  join(
    @CurrentUser() user: UserEntity,
    @Param("classId", ParseIntPipe) classId: number,
    @Body() dto: JoinClassDto,
  ) {
    return this.classes.join(classId, user.id, dto.note);
  }

  @Delete("classes/:classId/leave")
  @HttpCode(204)
  leave(@CurrentUser() user: UserEntity, @Param("classId", ParseIntPipe) classId: number) {
    return this.classes.leave(classId, user.id);
  }

  // --- the thread ----------------------------------------------------------

  /**
   * Talking is **not** behind the paid month — see `MessageEntity`. Sorting out
   * the month is usually exactly what the conversation is about.
   */
  @Get("enrollments/:id/messages")
  async messageList(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    // Opening the thread is reading it: a separate "mark read" call the front
    // end has to remember is one it eventually forgets.
    await this.messages.markRead(enrollment.id, user.id);
    return this.messages.list(enrollment.id);
  }

  @Post("enrollments/:id/messages")
  async sendMessage(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.messages.send(enrollment, user.id, dto);
  }

  // --- the timeline --------------------------------------------------------

  /**
   * The client's own record of their own body — **not** behind the paid month.
   * See `ProgressService`: a product that hides somebody's photographs of
   * themselves because they stopped paying is holding their history hostage.
   */
  @Get("enrollments/:id/progress")
  async progressList(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.progress.list(enrollment.id);
  }

  /** The first entry with a photograph beside the latest one. */
  @Get("enrollments/:id/progress/comparison")
  async progressComparison(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.progress.comparison(enrollment.id);
  }

  @Post("enrollments/:id/progress")
  async createProgress(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: UpsertProgressDto,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.progress.create(enrollment, dto);
  }

  @Put("enrollments/:id/progress/:entryId")
  async updateProgress(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Param("entryId", ParseIntPipe) entryId: number,
    @Body() dto: UpsertProgressDto,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.progress.update(enrollment.id, entryId, dto);
  }

  @Delete("enrollments/:id/progress/:entryId")
  @HttpCode(204)
  async removeProgress(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Param("entryId", ParseIntPipe) entryId: number,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.progress.remove(enrollment.id, entryId);
  }

  /**
   * The remarks on one recording, and opening it counts as reading them.
   *
   * Marking it seen here rather than in a call the front end has to remember is
   * what keeps the badge on the tab honest — see `ClientVideoEntity.clientSeenAt`.
   */
  @Get("enrollments/:id/videos/:videoId/comments")
  async videoComments(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Param("videoId", ParseIntPipe) videoId: number,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    const video = await this.videos.findForEnrollment(enrollment.id, videoId);

    await this.videos.markSeenByClient(video);
    return this.videos.comments_(video);
  }

  @Post("enrollments/:id/videos/:videoId/comments")
  async commentOnVideo(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Param("videoId", ParseIntPipe) videoId: number,
    @Body() dto: VideoCommentDto,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    const video = await this.videos.findForEnrollment(enrollment.id, videoId);

    // `fromTrainer: false` — a client's own remark must not mark their video
    // answered, or the trainer's inbox empties itself.
    return this.videos.comment(video, user.id, dto.body, false);
  }

  @Delete("enrollments/:id/videos/:videoId")
  @HttpCode(204)
  async removeVideo(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Param("videoId", ParseIntPipe) videoId: number,
  ) {
    const enrollment = await this.enrollments.findForClient(user.id, id);
    return this.videos.removeAsClient(enrollment, videoId);
  }
}
