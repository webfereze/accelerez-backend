import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PartialType } from "@nestjs/mapped-types";
import { MenuKey, MenuLinkType, SystemSection } from "@shared/enums/menu.enum";
import { TranslatedTextDto } from "@shared/types/translated";

export class CreateMenuItemDto {
  @IsEnum(MenuKey)
  menu: MenuKey;

  /** Optional — falls back to the linked page's title. */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TranslatedTextDto)
  label?: TranslatedTextDto;

  @IsEnum(MenuLinkType)
  linkType: MenuLinkType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageId?: number;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsEnum(SystemSection)
  systemKey?: SystemSection;

  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}

class ReorderEntryDto {
  @Type(() => Number)
  @IsInt()
  id: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @Type(() => Number)
  @IsInt()
  sortOrder: number;
}

export class ReorderMenuDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderEntryDto)
  items: ReorderEntryDto[];
}
