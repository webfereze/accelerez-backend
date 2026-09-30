import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { LOCALES } from "@shared/types/translated";

/**
 * Public registration — and it creates a **client**, always.
 *
 * There is deliberately no role field. Trainers are added by an administrator,
 * which is the admission model of the whole product: a directory anybody can
 * list themselves in is not a directory of vetted coaches, and a "sunt
 * antrenor" checkbox on a sign-up form is exactly that.
 *
 * A visitor who arrived from a trainer's profile is enrolled with that coach
 * immediately afterwards, by the front end, with the token this returns — one
 * endpoint that both creates an account and writes into a coach's inbox would
 * be the most attackable route in the product.
 */
export class RegisterDto {
  @IsEmail({}, { message: "Adresa de e-mail nu este validă." })
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @MaxLength(190)
  email: string;

  /**
   * Six characters, matching `LoginDto`. A shorter one would register fine and
   * then be refused at sign-in, which reads as a broken account rather than a
   * rejected password.
   */
  @IsString() @MinLength(6) @MaxLength(72) password: string;

  @IsString() @MinLength(2) @MaxLength(120) firstName: string;
  @IsOptional() @IsString() @MaxLength(120) lastName?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;

  @IsOptional() @IsIn(LOCALES as unknown as string[]) locale?: string;

  /**
   * Consent to the terms, and it must be `true` — not merely present. An
   * unchecked box arrives as `false` and has to fail validation, or the record
   * says the person agreed when they did not.
   */
  @IsBoolean() @Transform(({ value }) => value === true || value === "true")
  acceptTerms: boolean;

  /**
   * Honeypot. A real visitor never sees this field; a script fills everything.
   * Rejected silently — telling a bot why it failed is how it learns to pass.
   */
  @IsOptional() @IsString() website?: string;
}
