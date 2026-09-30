import { UserEntity } from "./user.entity";
import { PageEntity } from "./page.entity";
import { MenuItemEntity } from "./menu-item.entity";
import { SiteSettingEntity } from "./site-setting.entity";
import { SeedRunEntity } from "./seed-run.entity";
import { PostEntity } from "./post.entity";
import { SubscriberEntity } from "./subscriber.entity";
import { FaqEntity } from "./faq.entity";
import { TestimonialEntity } from "./testimonial.entity";
import { ContactRequestEntity } from "./contact-request.entity";
import { TrainerEntity } from "./trainer.entity";
import { EnrollmentEntity } from "./enrollment.entity";
import { MembershipPeriodEntity } from "./membership-period.entity";
import { ResourceEntity } from "./resource.entity";
import { ClientVideoEntity } from "./client-video.entity";
import { ProgressEntryEntity } from "./progress-entry.entity";
import { TrainingSessionEntity } from "./training-session.entity";
import { SessionAttendeeEntity } from "./session-attendee.entity";
import { MessageEntity } from "./message.entity";
import { VideoCommentEntity } from "./video-comment.entity";
import { TrainingClassEntity } from "./training-class.entity";
import { ClassMemberEntity } from "./class-member.entity";
import { ProductEntity } from "./product.entity";
import { OrderEntity } from "./order.entity";

/**
 * Single source of truth for TypeORM entities.
 *
 * When you add an entity: create it in this folder and add it here. It is then
 * picked up by the runtime connection (`modules/mariaDB.module.ts`),
 * repositories (`shared.module.ts`) and the migrations CLI — all of which
 * import this array.
 *
 * Forgetting it is the classic `EntityMetadataNotFoundError` at boot.
 */
export const entities = [
  UserEntity,
  PageEntity,
  MenuItemEntity,
  SiteSettingEntity,
  SeedRunEntity,
  PostEntity,
  SubscriberEntity,
  FaqEntity,
  TestimonialEntity,
  ContactRequestEntity,
  TrainerEntity,
  EnrollmentEntity,
  MembershipPeriodEntity,
  ResourceEntity,
  ClientVideoEntity,
  ProgressEntryEntity,
  TrainingSessionEntity,
  SessionAttendeeEntity,
  MessageEntity,
  VideoCommentEntity,
  TrainingClassEntity,
  ClassMemberEntity,
  ProductEntity,
  OrderEntity,
];

export {
  UserEntity,
  PageEntity,
  MenuItemEntity,
  SiteSettingEntity,
  SeedRunEntity,
  PostEntity,
  SubscriberEntity,
  FaqEntity,
  TestimonialEntity,
  ContactRequestEntity,
  TrainerEntity,
  EnrollmentEntity,
  MembershipPeriodEntity,
  ResourceEntity,
  ClientVideoEntity,
  ProgressEntryEntity,
  TrainingSessionEntity,
  SessionAttendeeEntity,
  MessageEntity,
  VideoCommentEntity,
  TrainingClassEntity,
  ClassMemberEntity,
  ProductEntity,
  OrderEntity,
};

// Re-exported from their own modules so a consumer imports one place —
// `@shared/entities` — rather than having to know which enum lives where.
export { UserRole, STAFF_ROLES, PORTAL_ROLES } from "@shared/enums/user-role.enum";
export { PageStatus } from "@shared/enums/page-status.enum";
export { PageLayout } from "@shared/enums/page-layout.enum";
export {
  Specialization,
  TrainingFormat,
  EnrollmentStatus,
  MembershipStatus,
  PaymentMethod,
  ResourceType,
  ResourceVisibility,
  ClientVideoStatus,
  RequestStatus,
  BlogCategory,
  SessionKind,
  SessionLocation,
  SessionStatus,
  AttendanceStatus,
  ProductCategory,
  OrderStatus,
} from "@shared/enums/accelerez.enum";
