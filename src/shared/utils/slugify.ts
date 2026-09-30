/**
 * URL-safe slug from arbitrary text. Handles Hungarian and Romanian diacritics
 * (ő ű ă â î ș ț) by decomposing to ASCII first — a slug must survive being
 * typed by hand and pasted into a link.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[łŁ]/g, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 190);
}

/**
 * Appends `-2`, `-3`, … until the slug is not in `taken`. Callers pass the
 * slugs already used by sibling rows.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;

  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
