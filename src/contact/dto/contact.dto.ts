import { Transform, Type } from "class-transformer";
import {
  IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString,
  MaxLength, Min, MinLength,
} from "class-validator";
import { RequestStatus, Specialization } from "@shared/enums/accelerez.enum";

/**
 * The short form.
 *
 * **Three required fields and no more.** Name, e-mail, a short message. No
 * mandatory goal, no budget, no questionnaire — someone who is not yet sure
 * what they want is exactly the person this form exists for.
 *
 * `goal` is optional precisely so "nu știu încă" is a real answer rather than
 * a value somebody has to invent.
 */
export class CreateContactRequestDto {
  @IsString() @MinLength(2) @MaxLength(160) name: string;

  @IsEmail({}, { message: "Te rugăm să introduci o adresă de e-mail validă." })
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @MaxLength(200)
  email: string;

  @IsString() @MinLength(5) @MaxLength(5000) message: string;

  @IsOptional() @IsString() @MaxLength(200) company?: string;
  @IsOptional() @IsString() @MaxLength(60) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) website?: string;

  /** Absent means "I don't know yet" — a valid answer, not a missing one. */
  @IsOptional() @IsEnum(Specialization) goal?: Specialization;

  @IsOptional() @IsString() @MaxLength(5) locale?: string;

  /** Hidden fields — captured, never shown to the sender. */
  @IsOptional() @IsString() @MaxLength(500) sourceUrl?: string;
  @IsOptional() @IsString() @MaxLength(200) sourcePost?: string;

  /**
   * Honeypot. A real visitor never sees this field and never fills it; a script
   * fills everything. Rejected silently — telling a bot why it failed is how it
   * learns to pass next time.
   */
  @IsOptional() @IsString() @MaxLength(200) fax?: string;

  @IsOptional() @IsBoolean() consent?: boolean;
}

export class ContactRequestQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPage?: number;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsEnum(RequestStatus) status?: RequestStatus;
}

export class UpdateContactRequestDto {
  @IsOptional() @IsEnum(RequestStatus) status?: RequestStatus;
  @IsOptional() @IsString() @MaxLength(5000) note?: string | null;
}
