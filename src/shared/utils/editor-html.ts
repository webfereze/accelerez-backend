/**
 * Cleans the paste damage a rich-text editor brings in with it.
 *
 * Text pasted from Word, Google Docs or another website arrives with **every
 * space as a non-breaking space** — `&nbsp;` or the literal U+00A0. Quill keeps
 * them, so the paragraph is stored that way and the browser then treats the
 * whole thing as a single unbreakable word: it cannot wrap at any space,
 * because as far as CSS is concerned there are none.
 *
 * What that looks like on the page is text broken mid-letter. It reads as a
 * CSS bug and is not one — `overflow-wrap: break-word` is doing the only thing
 * left to it when a "word" three sentences long has to fit in a column.
 *
 * So it is fixed where it enters, on write, rather than patched at render time
 * in each of the places that display it.
 *
 * **A deliberate non-breaking space is collateral here** — "10&nbsp;km" keeping
 * its unit on the line would be flattened too. That is accepted: Quill offers
 * no way to type one on purpose, so every one in this database arrived by
 * accident, and the damage from keeping them is far larger than from losing a
 * typographic nicety nobody asked for.
 */

/** `&nbsp;`, `&#160;`, `&#xA0;` and the literal character. */
const NBSP = /&nbsp;|&#160;|&#x0*a0;| /gi;

/** One string's worth. Returns it unchanged when there is nothing to do. */
export function cleanEditorHtml(html: string): string {
  return html.replace(NBSP, " ");
}

/**
 * The same, applied to every string anywhere inside a block tree.
 *
 * A walk rather than a list of known fields: block `data` is free-form JSON that
 * differs per block type and gains shapes as block types are added, so anything
 * addressing `data.html` by name is a fix that silently stops covering new
 * blocks. Non-HTML strings are unaffected in practice — nothing else has a
 * reason to hold a non-breaking space.
 *
 * Returns the value unchanged (same reference) when nothing needed cleaning, so
 * a save that changes nothing does not look like a change.
 */
export function cleanEditorContent<T>(value: T): T {
  if (typeof value === "string") {
    return cleanEditorHtml(value) as unknown as T;
  }

  if (Array.isArray(value)) {
    let touched = false;
    const next = value.map((item) => {
      const cleaned = cleanEditorContent(item);
      if (cleaned !== item) touched = true;
      return cleaned;
    });
    return (touched ? next : value) as unknown as T;
  }

  if (value && typeof value === "object") {
    let touched = false;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = cleanEditorContent(item);
      if (cleaned !== item) touched = true;
      next[key] = cleaned;
    }
    return (touched ? next : value) as unknown as T;
  }

  return value;
}
