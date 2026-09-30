import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ValidateNested } from "class-validator";
import { TranslatedDto, TranslatedTextDto } from "@shared/types/translated";
import { PageStatus } from "@shared/enums/page-status.enum";
import { BlogCategory, Specialization } from "@shared/enums/accelerez.enum";
import { LOCALES } from "@shared/types/translated";

export class UpsertPostDto {
  /**
   * One slug per language. Left out, each is derived from that language's
   * title — never from the Romanian one, which would put Romanian words in a
   * Hungarian URL.
   */
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) slug?: TranslatedTextDto;

  @ValidateNested() @Type(() => TranslatedDto) title: TranslatedDto;

  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) excerpt?: TranslatedTextDto;

  @IsOptional() @IsArray() content?: unknown[];

  @IsOptional() @IsString() @MaxLength(500) coverImage?: string | null;
  @IsOptional() @IsString() @MaxLength(300) coverAlt?: string | null;

  @IsOptional() @IsString() @MaxLength(160) author?: string | null;

  /** A real author and their role — what makes a byline evidence. */
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) authorRole?: TranslatedTextDto;

  /** Exactly one, from the closed list of five. */
  @IsOptional() @IsEnum(BlogCategory) category?: BlogCategory | null;

  /** Goals the article speaks to, deliberately not categories. Any number. */
  @IsOptional() @IsArray() @IsEnum(Specialization, { each: true })
  specializations?: Specialization[];

  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  @IsOptional() @IsBoolean() isFeatured?: boolean;

  // A ceiling as well as a floor: a four-digit reading time is a typo, and it
  // is printed straight onto the card.
  @IsOptional() @IsInt() @Min(1) @Max(999) readingMinutes?: number | null;

  @IsOptional() @IsEnum(PageStatus) status?: PageStatus;

  /**
   * Normally left out — the service stamps it on first publish. Accepted so an
   * editor can backdate an article that was written before the site existed.
   */
  @IsOptional() @IsDateString() publishedAt?: string | null;

  /**
   * The last *substantive* revision, set deliberately — not
   * `updatedAt`, which moves every time somebody opens the editor.
   */
  @IsOptional() @IsDateString() contentUpdatedAt?: string | null;

  /**
   * What the article points at when it ends. Capped on purpose: an article that
   * recommends six trainers recommends none, and the limit is validated rather
   * than left to editorial discipline.
   */
  @IsOptional() @IsArray() @ArrayMaxSize(2) @IsInt({ each: true })
  relatedTrainerIds?: number[];

  @IsOptional() @IsArray() @ArrayMaxSize(2) @IsInt({ each: true }) relatedPostIds?: number[];

  /** The closing call to action and where it goes. */
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) ctaLabel?: TranslatedTextDto;
  @IsOptional() @IsString() @MaxLength(300) ctaHref?: string | null;

  /** Which languages this article is actually live in. Romanian is required. */
  @IsOptional() @IsArray() @IsIn(LOCALES as unknown as string[], { each: true })
  publishedLocales?: string[];

  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) seoTitle?: TranslatedTextDto;
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) seoDescription?: TranslatedTextDto;
  @IsOptional() @IsBoolean() noindex?: boolean;
}

/** Query parameters the admin list accepts. */
export class PostQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPage?: number;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsEnum(PageStatus) status?: PageStatus;
  @IsOptional() @IsString() @MaxLength(80) tag?: string;
  @IsOptional() @IsEnum(BlogCategory) category?: BlogCategory;
}
