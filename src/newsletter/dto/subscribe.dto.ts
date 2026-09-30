import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";

export class SubscribeDto {
  @IsEmail({}, { message: "Adresa de e-mail nu este validă." })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @MaxLength(200)
  email: string;

  @IsOptional() @IsString() @MaxLength(160) name?: string;

  @IsOptional() @IsString() @MaxLength(5) locale?: string;

  @IsOptional() @IsString() @MaxLength(120) source?: string;

  /**
   * The consent tick. **Required and must be true** — this is the only field
   * that makes the rest of the record lawful to keep, so it is validated
   * rather than assumed from the request arriving at all.
   */
  @IsBoolean()
  consent: boolean;
}

export class SubscriberQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPage?: number;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsIn(["active", "unsubscribed"]) status?: "active" | "unsubscribed";
}
