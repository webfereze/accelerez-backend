import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  ClientVideoStatus,
  EnrollmentStatus,
  MembershipStatus,
  PaymentMethod,
  ResourceType,
  ResourceVisibility,
} from "@shared/enums/accelerez.enum";

/** A client asking to train with someone. */
export class EnrollDto {
  @IsInt() trainerId: number;

  /**
   * Their goal, in their own words. Required and given a floor: "salut" tells
   * a trainer nothing, and the first thing they decide is whether to accept.
   */
  @IsString() @MinLength(10) @MaxLength(2000) goal: string;
}

/** What a trainer does with a request, and with an enrolment afterwards. */
export class UpdateEnrollmentDto {
  @IsOptional() @IsEnum(EnrollmentStatus) status?: EnrollmentStatus;

  /** The trainer's private note. Never returned to the client. */
  @IsOptional() @IsString() @MaxLength(5000) trainerNote?: string | null;
}

/**
 * Confirming a period.
 *
 * `startsOn` is optional and usually left out: the service continues from the
 * day after the last period ended, which is what a trainer confirming a few
 * days late actually means. It is accepted so a backdated confirmation is
 * possible — a client who paid last week and was forgotten.
 *
 * The length is not a field. Twenty-eight days is the product's unit, not a
 * per-client negotiation, and a duration somebody can type is one that will
 * differ between two clients of the same coach.
 */
export class UpsertPeriodDto {
  /** `YYYY-MM-DD`. Defaults to the day after the last period, or today. */
  @IsOptional() @IsDateString() startsOn?: string;

  @IsOptional() @IsEnum(MembershipStatus) status?: MembershipStatus;
  @IsOptional() @IsNumber() @Min(0) @Max(1000000) amount?: number | null;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;

  /**
   * How the money arrived. `CARD` is refused here — see `PaymentMethod`: a card
   * payment is something a processor confirms, never something a person types.
   */
  @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod | null;

  @IsOptional() @IsDateString() paidAt?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) note?: string | null;
}

/** A video, a sheet, a diet, a tip — see `ResourceType`. */
export class UpsertResourceDto {
  @IsEnum(ResourceType) type: ResourceType;

  @IsOptional() @IsEnum(ResourceVisibility) visibility?: ResourceVisibility;

  /** Required when `visibility` is `CLIENT`; refused when it is `LIBRARY`. */
  @IsOptional() @IsInt() enrollmentId?: number | null;

  @IsString() @MinLength(2) @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;

  @IsOptional() @IsString() @MaxLength(1000) url?: string | null;
  @IsOptional() @IsString() @MaxLength(500) filePath?: string | null;

  /** Rich HTML, sanitised on save — the body of a diet or a tip. */
  @IsOptional() @IsString() body?: string | null;

  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

/** A client sending their trainer a recording. */
export class CreateClientVideoDto {
  @IsInt() enrollmentId: number;

  @IsString() @MinLength(2) @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(2000) note?: string | null;

  /** One of the two is required — the service enforces that, not the shape. */
  @IsOptional() @IsString() @MaxLength(500) filePath?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) url?: string | null;

  @IsOptional() @IsInt() fileSize?: number | null;
  @IsOptional() @IsString() @MaxLength(120) mimeType?: string | null;
}

/** The trainer's answer to one. */
export class ReviewClientVideoDto {
  @IsString() @MinLength(1) @MaxLength(5000) feedback: string;
  @IsOptional() @IsEnum(ClientVideoStatus) status?: ClientVideoStatus;
}

/** Filters for the trainer's client list and the video inbox. */
export class PortalQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPage?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(EnrollmentStatus) status?: EnrollmentStatus;
  @IsOptional() @IsEnum(ClientVideoStatus) videoStatus?: ClientVideoStatus;
  @IsOptional() @Type(() => Number) @IsInt() trainerId?: number;
  @IsOptional() @Type(() => Number) @IsInt() enrollmentId?: number;
}

/** What anyone signed in may change about their own account. */
export class UpdateAccountDto {
  @IsOptional() @IsString() @MaxLength(120) firstName?: string;
  @IsOptional() @IsString() @MaxLength(120) lastName?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(5) locale?: string;
}

/** Changing a password requires proving you know the current one. */
export class ChangePasswordDto {
  @IsString() @MinLength(1) currentPassword: string;
  @IsString() @MinLength(6) @MaxLength(72) newPassword: string;
}

/**
 * One point on the client's timeline.
 *
 * `takenAt` is required and everything else is optional — see
 * `ProgressEntryEntity`. The service refuses a row that carries nothing but the
 * date, which is the one combination this shape allows and the timeline cannot
 * use.
 */
export class UpsertProgressDto {
  /** `YYYY-MM-DD`. The day the photograph is of, not the day it was uploaded. */
  @IsDateString() takenAt: string;

  @IsOptional() @IsArray() @ArrayMaxSize(3)
  photos?: { url: string; pose?: "front" | "side" | "back" }[];

  @IsOptional() @IsNumber() @Min(20) @Max(400) weightKg?: number | null;

  /** Centimetres, as `{ waist: 84, hips: 96 }`. */
  @IsOptional() measurements?: Record<string, number>;

  @IsOptional() @IsString() @MaxLength(2000) note?: string | null;

  /** The client's own decision, and only theirs — see the entity. */
  @IsOptional() @IsBoolean() consentToShare?: boolean;
}

/** The trainer's remark on one point. They comment; they do not amend. */
export class ProgressCommentDto {
  @IsString() @MinLength(1) @MaxLength(2000) trainerNote: string;
}

/** One file or link travelling with a message. */
export class MessageAttachmentDto {
  @IsEnum(["video", "image", "document", "link"] as never) kind: string;
  @IsString() @MaxLength(1000) url: string;
  @IsOptional() @IsString() @MaxLength(300) name?: string;
  @IsOptional() @IsInt() size?: number;
  @IsOptional() @IsString() @MaxLength(120) mimeType?: string;
}

/**
 * A message.
 *
 * Both fields are optional here and the service refuses a message that is
 * neither text nor attachment — the rule is "one of the two", which a DTO can
 * only express as an unreadable pile of conditionals.
 */
export class SendMessageDto {
  @IsOptional() @IsString() @MaxLength(5000) body?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(5) @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}

/** A remark on one recording. Same shape whoever writes it. */
export class VideoCommentDto {
  @IsString() @MinLength(1) @MaxLength(3000) body: string;
}
