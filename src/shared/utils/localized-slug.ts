import { BadRequestException } from "@nestjs/common";
import { slugify } from "./slugify";
import { LOCALES, type Locale, type Translated } from "@shared/types/translated";

/**
 * URL segments, one per language.
 *
 * The product asks for distinct addresses per language ("adresele …
 * trebuie localizate"). Romanian is required because it is the source language;
 * the others are written only when that translation exists, which is what lets
 * the router refuse a language the record was never written in instead of
 * quietly serving Romanian under a Hungarian URL.
 */
export type LocalizedSlug = Partial<Record<Locale, string>> & { ro: string };

/**
 * Anything carrying per-language strings — a `Translated` value or the DTO
 * class that validates one. The DTO is a class and so has no index signature,
 * which is why this is deliberately loose rather than `Record<string, string>`.
 */
export type LocaleFields = Translated | { ro?: string; hu?: string; en?: string };

/**
 * Builds the slug set from whatever the editor supplied, falling back to the
 * title in the same language.
 *
 * A language with neither a slug nor a title simply gets no entry — it is not
 * inherited from Romanian, because a Hungarian URL made of Romanian words is
 * the silent substitution the product rule rules out.
 */
export function buildLocalizedSlug(
  slug: LocaleFields | undefined,
  title: LocaleFields | undefined,
): LocalizedSlug {
  const read = (source: LocaleFields | undefined, locale: Locale) =>
    (source as Record<string, unknown> | undefined)?.[locale];

  const ro = slugify(
    String(read(slug, "ro") ?? "").trim() || String(read(title, "ro") ?? ""),
  );
  if (!ro) throw new BadRequestException("Nu s-a putut genera un slug din titlu.");

  const out: LocalizedSlug = { ro };

  for (const locale of LOCALES) {
    if (locale === "ro") continue;
    const value = slugify(
      String(read(slug, locale) ?? "").trim() || String(read(title, locale) ?? ""),
    );
    if (value) out[locale] = value;
  }

  return out;
}

/** Reads one language's slug off a stored `Translated`-shaped column. */
export function slugFor(slug: Translated | unknown, locale: string): string | undefined {
  const value = (slug as Record<string, unknown> | null)?.[locale];
  return typeof value === "string" && value ? value : undefined;
}

/**
 * Refuses a slug already taken **in that language**.
 *
 * Refused rather than silently suffixed: a slug is a URL somebody may already
 * have shared, and quietly turning `strategie` into `strategie-2` gives two
 * pages that look identical in the admin. The collision that matters is within
 * one language's URL space — `contact` in Romanian and `contact` in English are
 * different addresses and may coexist.
 */
export function assertLocalizedSlugFree(
  wanted: LocalizedSlug,
  existing: Array<{ id: number; slug: unknown }>,
  skipId?: number,
): void {
  for (const [locale, value] of Object.entries(wanted)) {
    const clash = existing.find(
      (row) => row.id !== skipId && slugFor(row.slug, locale) === value,
    );
    if (clash) {
      throw new BadRequestException(
        `Slug-ul „${value}" este deja folosit în limba ${locale}.`,
      );
    }
  }
}
