import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/**
 * The locales the site ships in.
 *
 * Romanian is the **source** language: it is the required key and what every
 * other locale falls back to. Hungarian and English will often be absent on a
 * freshly written record and must degrade to Romanian rather than render blank.
 */
export const LOCALES = ["ro", "hu", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** The locale that is always present and is used as the fallback. */
export const SOURCE_LOCALE: Locale = "ro";

/** Locales that may legitimately be missing on a record. */
const OPTIONAL_LOCALES = ["hu", "en"] as const;

/**
 * A translatable field. Stored as a single JSON column:
 *
 *   { "ro": "Atracții", "hu": "Látnivalók", "en": "Attractions" }
 *
 * This is the project-wide convention — never `nameHu` / `nameRo` / `nameEn`
 * columns. Adding a language becomes a key, not a schema migration across every
 * table, and the field travels as one unit through DTOs, API responses and forms.
 */
export type Translated = {
  ro: string;
  hu?: string | null;
  en?: string | null;
};

/**
 * Validated shape for request bodies. Romanian is required — it is the fallback
 * every reader gets when a translation is missing, so a record without it has
 * no readable form at all.
 */
export class TranslatedDto {
  @IsString()
  @MinLength(1, { message: "Textul în limba română este obligatoriu." })
  @MaxLength(500)
  ro: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  hu?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  en?: string;
}

/** Same, but with no length ceiling — for descriptions and long text. */
export class TranslatedTextDto {
  @IsOptional()
  @IsString()
  ro?: string;

  @IsOptional()
  @IsString()
  hu?: string;

  @IsOptional()
  @IsString()
  en?: string;
}

/**
 * Reads a translatable field in the requested locale, falling back to the source
 * locale. Used server-side wherever a single string is needed (slugs, e-mails).
 */
export function pick(
  value: Translated | null | undefined,
  locale: Locale = SOURCE_LOCALE,
): string {
  if (!value) return "";
  const preferred = value[locale];
  if (typeof preferred === "string" && preferred.trim()) return preferred;
  return value[SOURCE_LOCALE] ?? "";
}

/** Drops empty strings so a blank input is stored as absent, not `""`. */
export function normalize(
  value: Partial<Translated> | null | undefined,
): Translated | null {
  if (!value) return null;

  const result: Translated = { ro: (value.ro ?? "").trim() };
  for (const locale of OPTIONAL_LOCALES) {
    const text = value[locale];
    if (typeof text === "string" && text.trim()) {
      result[locale] = text.trim();
    }
  }

  return result;
}
