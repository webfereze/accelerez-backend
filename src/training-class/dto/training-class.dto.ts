import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { PageStatus } from "@shared/enums/page-status.enum";
import { SessionLocation, Specialization } from "@shared/enums/accelerez.enum";
import { LOCALES, TranslatedDto, TranslatedTextDto } from "@shared/types/translated";

/** Creating or updating a class. */
export class UpsertTrainingClassDto {
  @ValidateNested() @Type(() => TranslatedDto) title: TranslatedDto;

  @IsOptional() @ValidateNested() @Type(() => TranslatedDto) slug?: TranslatedDto;
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) excerpt?: TranslatedTextDto;
  @IsOptional() @IsArray() content?: unknown[];

  @IsOptional() @IsString() @MaxLength(500) image?: string | null;
  @IsOptional() @IsString() @MaxLength(300) imageAlt?: string | null;

  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) scheduleText?: TranslatedTextDto;
  @IsOptional() @IsDateString() startsOn?: string | null;

  /** ISO weekdays — 1 is Monday. What "next training" is computed from. */
  @IsOptional() @IsArray() @IsInt({ each: true }) weekdays?: number[];

  /** `HH:MM`, 24-hour. */
  @IsOptional() @IsString() @MaxLength(5) startTime?: string | null;

  /** Shown only to people who have joined — see the entity. */
  @IsOptional() @IsString() @MaxLength(1000) meetingUrl?: string | null;

  // A ceiling as well as a floor: a four-digit class is a typo, and it is
  // printed straight onto the card.
  @IsOptional() @IsInt() @Min(5) @Max(600) durationMinutes?: number | null;

  @IsOptional() @IsNumber() @Min(0) @Max(100000) pricePerSession?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100000) pricePerMonth?: number | null;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;

  /** The corner ribbon. Empty means none — see the entity. */
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) ribbon?: TranslatedTextDto;

  @IsOptional() @IsEnum(SessionLocation) location?: SessionLocation;
  @IsOptional() @IsString() @MaxLength(300) place?: string | null;
  @IsOptional() @IsString() @MaxLength(120) city?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(500) capacity?: number | null;

  @IsOptional() @IsArray() @IsEnum(Specialization, { each: true })
  specializations?: Specialization[];

  @IsOptional() @IsArray() @IsInt({ each: true }) trainerIds?: number[];

  @IsOptional() @IsEnum(PageStatus) status?: PageStatus;
  @IsOptional() @IsBoolean() isFeatured?: boolean;

  @IsOptional() @IsArray() @IsIn(LOCALES as unknown as string[], { each: true })
  publishedLocales?: string[];

  @IsOptional() @IsInt() sortOrder?: number;

  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) seoTitle?: TranslatedTextDto;
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) seoDescription?: TranslatedTextDto;
  @IsOptional() @IsBoolean() noindex?: boolean;
}

/** Filters for the public list and the admin list alike. */
export class TrainingClassQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPage?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(Specialization) specialization?: Specialization;
  @IsOptional() @IsEnum(PageStatus) status?: PageStatus;
  @IsOptional() @IsString() @MaxLength(5) locale?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() featuredOnly?: boolean;
}

/**
 * What a **trainer** may change about their own class.
 *
 * Deliberately a different class from `UpsertTrainingClassDto`, not a subset of
 * it — the same reasoning as `UpdateOwnProfileDto`. Two fields are missing and
 * both are about the platform rather than the class:
 *
 * - **`isFeatured`** decides what fills the home page's teaser row. A coach who
 *   could tick it would be choosing what the whole platform leads with.
 * - **`sortOrder`** orders every class against every other, so it is only
 *   meaningful to somebody looking at all of them.
 *
 * Publishing *is* here, unlike on a trainer's own profile. A profile being live
 * is admission to a vetted directory and belongs to whoever does the vetting; a
 * class is the coach's own offer, and making them ask an administrator to
 * publish their own Tuesday session is friction with nothing behind it.
 */
export class UpdateOwnClassDto {
  @ValidateNested() @Type(() => TranslatedDto) title: TranslatedDto;

  @IsOptional() @ValidateNested() @Type(() => TranslatedDto) slug?: TranslatedDto;
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) excerpt?: TranslatedTextDto;
  @IsOptional() @IsArray() content?: unknown[];

  @IsOptional() @IsString() @MaxLength(500) image?: string | null;
  @IsOptional() @IsString() @MaxLength(300) imageAlt?: string | null;

  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) scheduleText?: TranslatedTextDto;
  @IsOptional() @IsDateString() startsOn?: string | null;
  @IsOptional() @IsArray() @IsInt({ each: true }) weekdays?: number[];
  @IsOptional() @IsString() @MaxLength(5) startTime?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) meetingUrl?: string | null;
  @IsOptional() @IsInt() @Min(5) @Max(600) durationMinutes?: number | null;

  @IsOptional() @IsNumber() @Min(0) @Max(100000) pricePerSession?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100000) pricePerMonth?: number | null;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;

  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) ribbon?: TranslatedTextDto;

  @IsOptional() @IsEnum(SessionLocation) location?: SessionLocation;
  @IsOptional() @IsString() @MaxLength(300) place?: string | null;
  @IsOptional() @IsString() @MaxLength(120) city?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(500) capacity?: number | null;

  @IsOptional() @IsArray() @IsEnum(Specialization, { each: true })
  specializations?: Specialization[];

  /**
   * Co-trainers. The owner is added back by the service whatever this says —
   * a coach who removed themselves would lose the class from their own portal
   * and have no way to get it back without an administrator.
   */
  @IsOptional() @IsArray() @IsInt({ each: true }) trainerIds?: number[];

  @IsOptional() @IsEnum(PageStatus) status?: PageStatus;

  @IsOptional() @IsArray() @IsIn(LOCALES as unknown as string[], { each: true })
  publishedLocales?: string[];

  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) seoTitle?: TranslatedTextDto;
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) seoDescription?: TranslatedTextDto;
  @IsOptional() @IsBoolean() noindex?: boolean;
}

/** Joining a class. The note is optional and the coach reads it. */
export class JoinClassDto {
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

/** The coach's private note about one member. */
export class MemberNoteDto {
  @IsString() @MaxLength(2000) trainerNote: string;
}
