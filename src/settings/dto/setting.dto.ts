import { IsObject } from "class-validator";

export class UpdateSettingDto {
  /**
   * The setting body. Its shape is owned by whatever consumes it (the footer,
   * for now), so it is validated as an object and no further — that is the
   * point of a key/value store.
   */
  @IsObject()
  value: Record<string, unknown>;
}
