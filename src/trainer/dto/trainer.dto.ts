import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { PageStatus } from "@shared/enums/page-status.enum";
import { Specialization, TrainingFormat } from "@shared/enums/accelerez.enum";
import { LOCALES, TranslatedDto, TranslatedTextDto } from "@shared/types/translated";

/** One certification, as it appears on the profile. */
export class CertificationDto {
  @IsString() @MinLength(2) @MaxLength(160) name: string;
  @IsOptional() @IsString() @MaxLength(160) issuer?: string;
  @IsOptional() @IsInt() @Min(1950) @Max(2100) year?: number;
}

/**
 * Creating or updating a trainer.
 *
 * **The account and the profile are one form.** An administrator adding a coach
 * types their name, their e-mail and a first password once; splitting it into
 * "create a user, then create a profile" produces orphans in both directions
 * the first time somebody is interrupted halfway.
 *
 * `email` and `password` are therefore here rather than on a separate user DTO.
 * On update they are optional: an absent password means "leave it alone", which
 * is not the same as an empty one.
 */
export class UpsertTrainerDto {
  // --- account -------------------------------------------------------------

  @IsEmail({}, { message: "Adresa de e-mail nu este validă." })
  @MaxLength(190)
  email: string;

  /**
   * Only on create, or when an administrator resets it. Six characters is what
   * `LoginDto` enforces at the other end — a shorter one would save fine and
   * then refuse to sign in, which reads as a broken login rather than a
   * rejected password.
   */
  @IsOptional() @IsString() @MinLength(6) @MaxLength(72) password?: string;

  @IsOptional() @IsString() @MaxLength(120) firstName?: string;
  @IsOptional() @IsString() @MaxLength(120) lastName?: string;
  @IsOptional() @IsString() @MaxLength(5) accountLocale?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;

  // --- profile -------------------------------------------------------------

  @IsString() @MinLength(2) @MaxLength(160) displayName: string;

  @IsOptional() @ValidateNested() @Type(() => TranslatedDto) slug?: TranslatedDto;
  @IsOptional() @ValidateNested() @Type(() => TranslatedDto) headline?: TranslatedDto;
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) excerpt?: TranslatedTextDto;

  /** The block body. Validated against the registry in `PageService`'s shape. */
  @IsOptional() @IsArray() content?: unknown[];

  @IsOptional() @IsString() @MaxLength(500) photo?: string | null;
  @IsOptional() @IsString() @MaxLength(500) coverImage?: string | null;

  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) county?: string;

  @IsOptional() @IsArray() @IsEnum(TrainingFormat, { each: true })
  formats?: TrainingFormat[];

  @IsOptional() @IsArray() @IsEnum(Specialization, { each: true })
  specializations?: Specialization[];

  @IsOptional() @IsInt() @Min(0) @Max(70) yearsExperience?: number | null;

  @IsOptional() @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  /** A ceiling as well as a floor: a six-figure monthly price is a typo. */
  @IsOptional() @IsNumber() @Min(0) @Max(100000) monthlyPrice?: number | null;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;

  @IsOptional() @IsInt() @Min(0) @Max(500) capacity?: number | null;
  @IsOptional() @IsBoolean() isAcceptingClients?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;

  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(190) publicEmail?: string;

  /** `{ instagram, facebook, youtube, tiktok, website }` — see the entity. */
  @IsOptional() social?: Record<string, string>;

  @IsOptional() @IsEnum(PageStatus) status?: PageStatus;

  @IsOptional() @IsArray() @IsIn(LOCALES as unknown as string[], { each: true })
  publishedLocales?: string[];

  @IsOptional() @IsInt() sortOrder?: number;

  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) seoTitle?: TranslatedTextDto;
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) seoDescription?: TranslatedTextDto;
  @IsOptional() @IsBoolean() noindex?: boolean;
}

/**
 * What a trainer may change about their own profile.
 *
 * Deliberately a different class from `UpsertTrainerDto`, not a subset of it:
 * a trainer must not be able to publish themselves, change their own e-mail,
 * feature themselves on the home page or edit their SEO. Modelling it as
 * "the admin DTO minus some fields" is how one forgotten `@IsOptional` hands a
 * coach the keys to the directory's front page.
 */
export class UpdateOwnProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) displayName?: string;
  @IsOptional() @ValidateNested() @Type(() => TranslatedDto) headline?: TranslatedDto;
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) excerpt?: TranslatedTextDto;
  @IsOptional() @IsArray() content?: unknown[];
  @IsOptional() @IsString() @MaxLength(500) photo?: string | null;
  @IsOptional() @IsString() @MaxLength(500) coverImage?: string | null;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) county?: string;
  @IsOptional() @IsArray() @IsEnum(TrainingFormat, { each: true }) formats?: TrainingFormat[];
  @IsOptional() @IsArray() @IsEnum(Specialization, { each: true })
  specializations?: Specialization[];
  @IsOptional() @IsInt() @Min(0) @Max(70) yearsExperience?: number | null;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true })
  @Type(() => CertificationDto) certifications?: CertificationDto[];
  @IsOptional() @IsNumber() @Min(0) @Max(100000) monthlyPrice?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(500) capacity?: number | null;

  /** The one switch a trainer owns outright — see the entity. */
  @IsOptional() @IsBoolean() isAcceptingClients?: boolean;

  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(190) publicEmail?: string;
  @IsOptional() social?: Record<string, string>;
}

/** Filters for the public directory and the admin list alike. */
export class TrainerQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPage?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(Specialization) specialization?: Specialization;
  @IsOptional() @IsEnum(TrainingFormat) format?: TrainingFormat;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsEnum(PageStatus) status?: PageStatus;
  @IsOptional() @IsString() @MaxLength(5) locale?: string;

  /** Public listings hide trainers who are full unless asked otherwise. */
  @IsOptional() @Type(() => Boolean) @IsBoolean() acceptingOnly?: boolean;
}
