import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { TrainerGuard } from "@auth/guards/trainer.guard";
import { CurrentUser } from "@auth/decorators/current-user.decorator";
import { UserEntity } from "@shared/entities";
import { TrainerService } from "../trainer/trainer.service";
import { TrainingClassService } from "../training-class/training-class.service";
import {
  MemberNoteDto,
  UpdateOwnClassDto,
} from "../training-class/dto/training-class.dto";
import { ClassMemberService } from "../training-class/class-member.service";
import { UpdateOwnProfileDto } from "../trainer/dto/trainer.dto";
import { EnrollmentService } from "./enrollment.service";
import { MembershipService } from "./membership.service";
import { ResourceService } from "./resource.service";
import { ClientVideoService } from "./client-video.service";
import { AccessService } from "./access.service";
import { AgendaService } from "./agenda.service";
import { ProgressService } from "./progress.service";
import { MessageService } from "./message.service";
import {
  PortalQueryDto,
  ProgressCommentDto,
  SendMessageDto,
  VideoCommentDto,
  ReviewClientVideoDto,
  UpdateEnrollmentDto,
  UpsertPeriodDto,
  UpsertResourceDto,
} from "./dto/portal.dto";

/**
 * The trainer's own portal.
 *
 * **The trainer is never named in a URL here — they come from the token.**
 * Every method resolves their profile from the signed-in account and then
 * filters by that id, so a client id, an enrolment id or a video id guessed in
 * a path belongs to somebody else's coach and returns 404.
 *
 * Administrator oversight is deliberately a different controller under
 * `/admin`, where the trainer *is* named in the URL. Folding both into one
 * route with a "scope" flag is how an admin-only branch ends up reachable with
 * a trainer's token.
 */
@UseGuards(JwtAuthGuard, TrainerGuard)
@Controller("portal/trainer")
export class PortalTrainerController {
  constructor(
    private readonly trainers: TrainerService,
    private readonly enrollments: EnrollmentService,
    private readonly memberships: MembershipService,
    private readonly resources: ResourceService,
    private readonly videos: ClientVideoService,
    private readonly progress: ProgressService,
    private readonly messages: MessageService,
    private readonly access: AccessService,
    private readonly classes: TrainingClassService,
    private readonly classMembers: ClassMemberService,
    private readonly calendar: AgendaService,
  ) {}

  // --- dashboard -----------------------------------------------------------

  /** The counts a coach opens the app for, in one call. */
  @Get("overview")
  async overview(@CurrentUser() user: UserEntity) {
    const trainer = await this.trainers.findByUserId(user.id);
    const [summary, unreadMessages] = await Promise.all([
      this.enrollments.trainerSummary(trainer.id),
      this.messages.unreadForTrainer(trainer.id, user.id),
    ]);

    return {
      unreadMessages,
      trainer: {
        id: trainer.id,
        displayName: trainer.displayName,
        photo: trainer.photo,
        status: trainer.status,
        isAcceptingClients: trainer.isAcceptingClients,
        capacity: trainer.capacity,
        monthlyPrice: trainer.monthlyPrice,
        currency: trainer.currency,
      },
      ...summary,
    };
  }

  // --- profile -------------------------------------------------------------

  @Get("profile")
  async profile(@CurrentUser() user: UserEntity) {
    return this.trainers.findByUserId(user.id);
  }

  /**
   * What a trainer may change about themselves — see `UpdateOwnProfileDto`.
   * Publication, featuring and SEO are not in that class and so cannot arrive.
   */
  @Put("profile")
  updateProfile(@CurrentUser() user: UserEntity, @Body() dto: UpdateOwnProfileDto) {
    return this.trainers.updateOwn(user.id, dto);
  }

  // --- clients -------------------------------------------------------------

  @Get("clients")
  async clients(@CurrentUser() user: UserEntity, @Query() query: PortalQueryDto) {
    const trainer = await this.trainers.findByUserId(user.id);
    const page = await this.enrollments.listForTrainer(trainer.id, query);

    // Two queries for the whole page rather than two per row — see
    // `unreadByEnrollment` and `pendingByEnrollment`.
    const ids = page.rows.map((row) => row.id);
    const [unread, pending] = await Promise.all([
      this.messages.unreadByEnrollment(ids, user.id),
      this.videos.pendingByEnrollment(ids),
    ]);

    return {
      ...page,
      rows: page.rows.map((row) => ({
        ...row,
        unreadMessages: unread[row.id] ?? 0,
        pendingVideos: pending[row.id] ?? 0,
      })),
    };
  }

  /** One client: the enrolment, their months, their material, their videos. */
  @Get("clients/:id")
  async client(@CurrentUser() user: UserEntity, @Param("id") id: string) {
    const trainer = await this.trainers.findByUserId(user.id);
    const enrollment = await this.enrollments.findForTrainer(trainer.id, id);

    const [periods, resources, videos, progress, messages, access] = await Promise.all([
      this.memberships.list(enrollment.id),
      this.resources.listForTrainer(trainer.id, enrollment.id),
      this.videos.listForTrainer(trainer.id, { enrollmentId: enrollment.id, perPage: 100 }),
      this.progress.list(enrollment.id),
      this.messages.list(enrollment.id),
      // The same state the client sees, so the two of them are looking at one
      // number when one asks the other about it.
      this.access.stateFor(enrollment),
    ]);

    // Opening a client's screen is reading their thread.
    await this.messages.markRead(enrollment.id, user.id);

    return {
      enrollment: { ...enrollment, access },
      periods,
      resources,
      videos: videos.rows,
      progress,
      messages,
    };
  }

  /** Accept, decline, pause, end — and the private note. */
  @Patch("clients/:id")
  async updateClient(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.enrollments.updateAsTrainer(trainer.id, id, dto);
  }

  // --- months --------------------------------------------------------------

  /**
   * Marks a month paid. **This is the switch that opens the client's area** —
   * see `AccessService`.
   */
  @Post("clients/:id/periods")
  async markPeriod(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: UpsertPeriodDto,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    const enrollment = await this.enrollments.findForTrainer(trainer.id, id);
    return this.memberships.upsert(enrollment, dto, user.id);
  }

  @Delete("clients/:id/periods/:periodId")
  @HttpCode(204)
  async removePeriod(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Param("periodId", ParseIntPipe) periodId: number,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    const enrollment = await this.enrollments.findForTrainer(trainer.id, id);
    return this.memberships.remove(enrollment.id, periodId);
  }

  /** Collected by month. `WAIVED` is counted apart — see the service. */
  @Get("revenue")
  async revenue(@CurrentUser() user: UserEntity) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.memberships.revenueByMonth(trainer.id);
  }

  /**
   * A remark on one point of the client's timeline — the only field a trainer
   * may write there. Editing the weight or the photograph would be editing
   * somebody else's record of their own body.
   */
  @Patch("clients/:id/progress/:entryId")
  async commentProgress(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Param("entryId", ParseIntPipe) entryId: number,
    @Body() dto: ProgressCommentDto,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    const enrollment = await this.enrollments.findForTrainer(trainer.id, id);
    return this.progress.comment(enrollment.id, entryId, dto.trainerNote);
  }

  /**
   * The thread on its own.
   *
   * The client's screen already receives the messages inside the detail
   * payload, so this looked redundant — and it is not: `MessageThread` refreshes
   * itself every fifteen seconds through `GET {path}/messages`, and without this
   * route the trainer's side of the same component polled a 404. One component
   * serving both sides means both sides need the same two routes.
   */
  @Get("clients/:id/messages")
  async messageList(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    const enrollment = await this.enrollments.findForTrainer(trainer.id, id);

    // Reading the thread is reading it — the same rule as the client's side.
    await this.messages.markRead(enrollment.id, user.id);
    return this.messages.list(enrollment.id);
  }

  @Post("clients/:id/messages")
  async sendMessage(
    @CurrentUser() user: UserEntity,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    const enrollment = await this.enrollments.findForTrainer(trainer.id, id);
    return this.messages.send(enrollment, user.id, dto);
  }

  // --- the calendar --------------------------------------------------------

  /**
   * The next fortnight, occurrence by occurrence, with who is expected.
   *
   * Derived from the classes' schedules rather than stored — see
   * `AgendaService`. `days` is capped so a curious query cannot ask for a
   * decade of unrolled Tuesdays.
   */
  @Get("agenda")
  async agenda(@CurrentUser() user: UserEntity, @Query("days") days?: string) {
    const trainer = await this.trainers.findByUserId(user.id);
    const window = Math.min(Math.max(Number(days) || 14, 1), 60);
    return this.calendar.forTrainer(trainer.id, window);
  }

  // --- classes -------------------------------------------------------------

  /**
   * The classes this coach is on, and the full CRUD over them.
   *
   * **A trainer owns their own classes.** What stays with the administrator is
   * everything that is a decision about the site rather than about the class:
   * which languages it is published in, whether it is featured on the home
   * page, and the order the list is shown in — see `UpdateOwnClassDto`, which
   * is the DTO that enforces it.
   */
  @Get("classes")
  async classList(@CurrentUser() user: UserEntity) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.classes.listForTrainerPortal(trainer.id);
  }

  @Get("classes/:id")
  async classDetail(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.classes.findForTrainer(trainer.id, id);
  }

  /** Creating one adds the coach to it — see `createAsTrainer`. */
  @Post("classes")
  async createClass(@CurrentUser() user: UserEntity, @Body() dto: UpdateOwnClassDto) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.classes.createAsTrainer(trainer.id, dto);
  }

  @Put("classes/:id")
  async updateClass(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOwnClassDto,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.classes.updateAsTrainer(trainer.id, id, dto);
  }

  /**
   * On a class shared with another coach this removes *them*, not the class —
   * see `removeAsTrainer`.
   */
  @Delete("classes/:id")
  @HttpCode(204)
  async removeClass(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.classes.removeAsTrainer(trainer.id, id);
  }

  /**
   * Who is in one of this coach's classes.
   *
   * `findForTrainer` first: the members are only theirs to see because the
   * class is, and an id in a URL must not hand somebody another coach's room.
   */
  @Get("classes/:id/members")
  async classMembers_(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    const trainingClass = await this.classes.findForTrainer(trainer.id, id);
    return this.classMembers.list(trainingClass.id);
  }

  /** Taking somebody off the class. Marked `left`, never deleted. */
  @Delete("classes/:id/members/:memberId")
  @HttpCode(204)
  async removeMember(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
    @Param("memberId", ParseIntPipe) memberId: number,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    const trainingClass = await this.classes.findForTrainer(trainer.id, id);
    return this.classMembers.removeMember(trainingClass.id, memberId);
  }

  /** The coach's private note about one member. Never returned to the client. */
  @Patch("classes/:id/members/:memberId")
  async noteMember(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
    @Param("memberId", ParseIntPipe) memberId: number,
    @Body() dto: MemberNoteDto,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    const trainingClass = await this.classes.findForTrainer(trainer.id, id);
    return this.classMembers.noteMember(trainingClass.id, memberId, dto.trainerNote);
  }

  // --- material ------------------------------------------------------------

  @Get("resources")
  async resourceList(
    @CurrentUser() user: UserEntity,
    @Query("enrollmentId") enrollmentId?: string,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.resources.listForTrainer(
      trainer.id,
      enrollmentId ? Number(enrollmentId) : undefined,
    );
  }

  /** The standing material every active client of theirs can read. */
  @Get("library")
  async library(@CurrentUser() user: UserEntity) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.resources.listLibrary(trainer.id);
  }

  @Post("resources")
  async createResource(@CurrentUser() user: UserEntity, @Body() dto: UpsertResourceDto) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.resources.create(trainer.id, dto);
  }

  @Put("resources/:id")
  async updateResource(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpsertResourceDto,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.resources.update(trainer.id, id, dto);
  }

  @Delete("resources/:id")
  @HttpCode(204)
  async removeResource(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.resources.remove(trainer.id, id);
  }

  // --- video inbox ---------------------------------------------------------

  @Get("videos")
  async videoInbox(@CurrentUser() user: UserEntity, @Query() query: PortalQueryDto) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.videos.listForTrainer(trainer.id, query);
  }

  @Patch("videos/:id")
  async reviewVideo(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReviewClientVideoDto,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.videos.review(trainer.id, id, dto, user.id);
  }

  @Get("videos/:id/comments")
  async videoComments(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    const video = await this.videos.findForTrainer(trainer.id, id);
    return this.videos.comments_(video);
  }

  /**
   * A trainer's remark is what marks the recording answered — see
   * `ClientVideoService.comment`. A status somebody has to set separately is a
   * status that stays `PENDING` on a video they have already replied to.
   */
  @Post("videos/:id/comments")
  async commentOnVideo(
    @CurrentUser() user: UserEntity,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VideoCommentDto,
  ) {
    const trainer = await this.trainers.findByUserId(user.id);
    const video = await this.videos.findForTrainer(trainer.id, id);
    return this.videos.comment(video, user.id, dto.body, true);
  }

  @Post("videos/:id/archive")
  async archiveVideo(@CurrentUser() user: UserEntity, @Param("id", ParseIntPipe) id: number) {
    const trainer = await this.trainers.findByUserId(user.id);
    return this.videos.archive(trainer.id, id);
  }
}
