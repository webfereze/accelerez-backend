import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { BlockDto } from "@shared/types/blocks";
import { TranslatedDto, TranslatedTextDto } from "@shared/types/translated";
import { PageLayout } from "@shared/enums/page-layout.enum";
import { PageStatus } from "@shared/enums/page-status.enum";

export class UpsertPageDto {
  /**
   * Optional on create — derived from the Hungarian title when absent. Always
   * lowercase kebab: a slug is part of a URL people type and share.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "A slug csak kisbetűket, számokat és kötőjelet tartalmazhat.",
  })
  slug?: string;

  @ValidateNested()
  @Type(() => TranslatedDto)
  title: TranslatedDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TranslatedTextDto)
  excerpt?: TranslatedTextDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  content?: BlockDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  sidebar?: BlockDto[];

  @IsOptional()
  @IsEnum(PageLayout)
  layout?: PageLayout;

  @IsOptional()
  @IsEnum(PageStatus)
  status?: PageStatus;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @IsBoolean()
  isHomepage?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => TranslatedTextDto)
  seoTitle?: TranslatedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TranslatedTextDto)
  seoDescription?: TranslatedTextDto;

  @IsOptional()
  @IsBoolean()
  noindex?: boolean;
}
