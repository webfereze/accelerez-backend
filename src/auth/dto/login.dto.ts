import { IsEmail, IsString, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class LoginDto {
  @IsEmail({}, { message: "Adresa de e-mail nu este validă." })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsString()
  @MinLength(6, { message: "Parola trebuie să aibă cel puțin 6 caractere." })
  password: string;
}
