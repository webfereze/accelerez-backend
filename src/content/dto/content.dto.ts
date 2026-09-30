import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { TranslatedDto, TranslatedTextDto } from "@shared/types/translated";

/** A question and its answer, in every language the site is written in. */
export class UpsertFaqDto {
  @ValidateNested() @Type(() => TranslatedDto) question: TranslatedDto;
  @ValidateNested() @Type(() => TranslatedTextDto) answer: TranslatedTextDto;

  @IsOptional() @IsString() @MaxLength(60) topic?: string | null;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isVisible?: boolean;
}

/**
 * A testimonial.
 *
 * `author` is required and `approved` defaults to false — a quote is somebody
 * else's words, and publishing them should take a deliberate act. See the
 * entity.
 */
export class UpsertTestimonialDto {
  @ValidateNested() @Type(() => TranslatedTextDto) quote: TranslatedTextDto;

  @IsString() @MinLength(2) @MaxLength(160) author: string;

  @IsOptional() @IsString() @MaxLength(160) role?: string | null;
  @IsOptional() @IsString() @MaxLength(200) company?: string | null;
  @IsOptional() @IsString() @MaxLength(500) avatar?: string | null;

  /** The trainer it is about, when it is about one. */
  @IsOptional() @IsInt() trainerId?: number | null;

  @IsOptional() @IsBoolean() approved?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}
