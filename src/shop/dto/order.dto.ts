import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  Max,
  ValidateNested,
  Equals,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { OrderStatus } from "@shared/enums/accelerez.enum";

/** One line of the cart: which product, which variant, how many — never how much. */
export class CartLineDto {
  @IsInt() @Min(1) productId: number;
  @IsString() @MaxLength(40) variantId: string;
  // A plan bought twelve times is a typo, not an order.
  @IsInt() @Min(1) @Max(10) quantity: number;
}

/** The cart, to be priced. Read-only — see `OrderService.quote`. */
export class QuoteDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CartLineDto)
  items: CartLineDto[];

  @IsOptional() @IsString() @MaxLength(5) locale?: string;
}

/**
 * Checking out the cart.
 *
 * **Products, variants and quantities — never how much.** There is no price
 * field anywhere in it, and that is the whole point: whatever a browser
 * sends, the order is priced from the product rows. When card payment arrives
 * this DTO does not change.
 *
 * Name, e-mail and telephone are required: the e-mail is where the plan goes,
 * and the telephone is how somebody gets hold of a customer whose e-mail
 * bounces.
 */
export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Coșul este gol." })
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CartLineDto)
  items: CartLineDto[];

  @IsString() @MinLength(2) @MaxLength(160) name: string;

  @IsEmail({}, { message: "Te rugăm să introduci o adresă de e-mail validă." })
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @MaxLength(200)
  email: string;

  // Digits, spaces, a leading plus, dashes, brackets. Loose on purpose: a
  // foreign number written the way its owner writes it is still a number.
  @IsString()
  @MinLength(6)
  @MaxLength(60)
  @Matches(/^[+\d][\d\s().-]{5,}$/, { message: "Te rugăm să introduci un număr de telefon valid." })
  phone: string;

  @IsOptional() @IsString() @MaxLength(3000) message?: string;

  @IsOptional() @IsString() @MaxLength(5) locale?: string;
  @IsOptional() @IsString() @MaxLength(500) sourceUrl?: string;

  /** Honeypot — see the contact form. */
  @IsOptional() @IsString() @MaxLength(200) fax?: string;

  @Equals(true, { message: "Este nevoie de acordul tău pentru a trimite comanda." })
  consent: boolean;
}

export class OrderQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPage?: number;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
}

export class UpdateOrderDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() @MaxLength(5000) note?: string | null;
}
