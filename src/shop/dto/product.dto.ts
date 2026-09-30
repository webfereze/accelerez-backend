import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { PageStatus } from "@shared/enums/page-status.enum";
import { ProductCategory } from "@shared/enums/accelerez.enum";
import { LOCALES, TranslatedDto, TranslatedTextDto } from "@shared/types/translated";

/** One way to buy it. See `ProductVariant`. */
export class ProductVariantDto {
  /** Stable; the editor generates it once. Letters, digits and dashes. */
  @IsString() @MaxLength(40) @Matches(/^[a-z0-9-]+$/i) id: string;

  @ValidateNested() @Type(() => TranslatedDto) label: TranslatedDto;

  // Null is "preț la cerere", never zero — see the entity.
  @IsOptional() @IsNumber() @Min(0) @Max(100000) price?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100000) compareAtPrice?: number | null;
}

export class UpsertProductDto {
  @ValidateNested() @Type(() => TranslatedDto) title: TranslatedDto;

  @IsOptional() @ValidateNested() @Type(() => TranslatedDto) slug?: TranslatedDto;
  @IsEnum(ProductCategory) category: ProductCategory;
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) excerpt?: TranslatedTextDto;
  @IsOptional() @IsArray() content?: unknown[];

  @IsOptional() @IsString() @MaxLength(500) image?: string | null;
  @IsOptional() @IsString() @MaxLength(300) imageAlt?: string | null;

  // A product nobody can choose is a product nobody can order.
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants: ProductVariantDto[];

  @IsOptional() @IsString() @MaxLength(3) currency?: string;

  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) deliveryNote?: TranslatedTextDto;
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) ribbon?: TranslatedTextDto;

  @IsOptional() @IsInt() trainerId?: number | null;

  @IsOptional() @IsEnum(PageStatus) status?: PageStatus;
  @IsOptional() @IsBoolean() isFeatured?: boolean;

  @IsOptional() @IsArray() @IsIn(LOCALES as unknown as string[], { each: true })
  publishedLocales?: string[];

  @IsOptional() @IsInt() sortOrder?: number;

  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) seoTitle?: TranslatedTextDto;
  @IsOptional() @ValidateNested() @Type(() => TranslatedTextDto) seoDescription?: TranslatedTextDto;
  @IsOptional() @IsBoolean() noindex?: boolean;
}

/** Filters for the public shop and the admin list alike. */
export class ProductQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPage?: number;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsEnum(ProductCategory) category?: ProductCategory;
  @IsOptional() @IsEnum(PageStatus) status?: PageStatus;
  @IsOptional() @IsString() @MaxLength(5) locale?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() featuredOnly?: boolean;
}
