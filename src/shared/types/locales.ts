import { IsArray, IsIn } from "class-validator";
import { LOCALES, type Locale } from "./translated";

/**
 * Which languages a record is actually live in.
 *
 * This product forbids silently substituting another language when a
 * translation is missing. `tr()` alone cannot honour that — it
 * falls back to Romanian by design — so the record has to say which languages
 * it has been written and approved in, and the public API filters on it.
 *
 * Romanian is always present: it is the source language and the one field the
 * DTOs require.
 *
 * Empty or absent is read as **Romanian only**, so records written before this
 * existed behave sensibly rather than disappearing.
 */
export type PublishedLocales = Locale[];

export class PublishedLocalesDto {
  @IsArray()
  @IsIn(LOCALES as unknown as string[], { each: true })
  publishedLocales: Locale[];
}

/** The languages this record is live in, defaulting to Romanian alone. */
export function liveLocales(value: unknown): Locale[] {
  if (!Array.isArray(value) || value.length === 0) return ["ro"];
  const known = value.filter((l): l is Locale =>
    (LOCALES as readonly string[]).includes(l as string),
  );
  return known.length ? known : ["ro"];
}

/** True when the record should be served in this language at all. */
export function isLiveIn(value: unknown, locale: string): boolean {
  return liveLocales(value).includes(locale as Locale);
}
