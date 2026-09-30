import { IsIn, IsObject, IsOptional, IsString } from "class-validator";

/**
 * Page content is a list of typed blocks, not a blob of HTML.
 *
 * Blocks let an editor assemble a page from a fixed vocabulary: the structure
 * is guaranteed, the markup stays accessible, and each piece is translated
 * independently.
 *
 * Adding a block type = add it here + a renderer on the frontend. The `data`
 * shape is owned by the renderer; the backend only guarantees `type` is known.
 *
 * This list must stay in step with the front end's `blocks/types.ts` and
 * `blocks/registry.tsx` — see the note on BLOCK_TYPES below.
 */
/**
 * Every block type the API will accept.
 *
 * **This list and the front end's `registry.tsx` are one decision in two
 * files.** A block registered in the editor but missing here is rejected on
 * save, and the symptom is a save that appears to do nothing — no error an
 * editor can act on, just a page that will not keep its content. Add a type to
 * both or to neither.
 *
 * The set below is the generic one. Add the project's own beside it; the
 * comment on each says what shape its `data` takes, which is the only place
 * that contract is written down.
 */
export const BLOCK_TYPES = [
  /** Full-bleed banner a page opens with. `data: { image, alt, eyebrow, title, subtitle, primaryLabel, primaryHref, secondaryLabel, secondaryHref, height, align }` */
  "hero",
  /** Full-bleed band with parallax and counted figures. `data: { image, alt, eyebrow, title, text, stats: [{ id, value, label }], ctaLabel, ctaHref }` */
  "showcase",
  /** The newest articles. Carries no posts — the page supplies them. `data: { eyebrow, title, text, linkLabel, count }` */
  "latestPosts",
  /** A wide orange panel with one figure. `data: { value, unit, eyebrow, title, ctaLabel, ctaHref }` */
  "promoBand",
  /** Picture beside reasons. `data: { image, alt, position, eyebrow, title, titleAccent, text, items: [{ id, icon, title, text }], ctaLabel, ctaHref, statValue, statLabel }` */
  "featureTeaser",
  /** Ways in, with a map. `data: { eyebrow, title, text, modes: [{ id, icon, title, duration, text }], mapEmbedUrl, note }` */
  "howToGetThere",
  /** Contact details and a message form on one dark panel. Details come from the `site` setting. `data: { eyebrow, title, text, mapEmbedUrl, buttonLabel, success }` */
  "contactPanel",
  /** A centred statement, counted figures and two pictures. `data: { title, text, stats: [{ id, icon, value, label }], imageLeft, imageLeftAlt, imageRight, imageRightAlt }` */
  "statsGallery",
  /** Long-form prose. `data: { html: Translated }` */
  "richText",
  /** `data: { url, alt, caption?: Translated, width }` */
  "image",
  /** Trainers, from the directory. Carries none. `data: { eyebrow, title, lead, linkLabel, count, specialization }` */
  "trainerGrid",
  /** The front page's opening. Faces and count come from the directory. `data: { badge, titleLead, titleAccent, titleRest, lead, primaryLabel, primaryHref, secondaryLabel, secondaryHref, showProof, proofLabel, cardTitle, cardBadge, cardItems, cardNote }` */
  "homeHero",
  /** A numbered sequence. `data: { eyebrow, title, lead, items: [{ id, icon, title, text }] }` */
  "steps",
  /** Questions from the FAQ collection. Carries none. `data: { eyebrow, title, lead, topic }` */
  "faqList",
  /** Classes, from the CMS. Carries none. `data: { eyebrow, title, lead, linkLabel, count, featuredOnly }` */
  "classGrid",
  /** Approved quotations, from the CMS. Carries none. `data: { eyebrow, title, lead, count }` */
  "testimonials",
  /** Edge-to-edge row of pictures with a word over each. `data: { items: [{ id, image, alt, title, text, href }] }` */
  "imageStrip",
  /** Two half-screen panels, each a photograph with a heading and one button. `data: { items: [{ id, image, alt, eyebrow, title, ctaLabel, ctaHref }] }` */
  "splitCta",
  /** Before-and-after pairs the reader drags between. `data: { eyebrow, title, lead, beforeLabel, afterLabel, items: [{ id, before, beforeAlt, after, afterAlt, name, meta, quote }] }` */
  "transformations",
  /** Recognitions as a ruled list. `data: { eyebrow, title, lead, linkLabel, linkHref, items: [{ id, title, year, category, text }] }` */
  "awards",
  /** Picture beside prose. `data: { image, alt, position, ratio, title, html, ctaLabel, ctaHref }` */
  "mediaText",
  /** `data: { title, columns, showImages, items: [{ id, image, alt, heading, text, href }] }` */
  "cardGrid",
  /** `data: { title, count, columns: [{ id, heading, html }] }` */
  "columns",
  /** Questions and answers. `data: { title, items: [{ id, question, answer }] }` */
  "accordion",
  /** A highlighted remark. `data: { tone, title, body: Translated }` */
  "notice",
  /** A call to action. `data: { title, text, href, label }` */
  "cta",
  /** `data: { title, columns, images: [{ id, url, alt, caption }] }` */
  "gallery",
  /** A gallery teaser with a "+N" tile. `data: { title, visible, images: [...] }` */
  "galleryPreview",
  /** `data: { eyebrow, title, slides: [{ id, image, alt, caption, href }] }` */
  "slider",
  /** `data: { url, poster, posterAlt, title, caption, ratio }` */
  "video",
  /** An iframe — map, 360° tour. `data: { url, title, ratio }` */
  "embed",
  /** Reads the `site` setting. `data: { name, role, phone, email, room, schedule }` */
  "contactCard",
  /** `data: { eyebrow, title, text, placeholder, buttonLabel, termsLabel, termsHref, success, askName }` */
  "newsletter",
  /** Two portraits side by side under one headline. `data: { left: { image, alt }, right: { image, alt }, eyebrow, titleLead, titleAccent, titleRest, lead, primaryLabel, primaryHref, secondaryLabel, secondaryHref }` */
  "duoHero",
  /** "For men" / "for women", one coach per side. `data: { eyebrow, title, lead, items: [{ id, image, alt, audience, name, text, results (one per line), ctaLabel, ctaHref, accent: "acid" | "flare" }] }` */
  "audienceSplit",
  /** Products from the shop. Carries none. `data: { eyebrow, title, lead, count, featuredOnly, category, linkLabel, note }` */
  "productGrid",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export type Block = {
  /** Stable id so React keys and reordering survive edits. */
  id: string;
  type: BlockType;
  data: Record<string, unknown>;
};

/**
 * Blocks are heterogeneous, so the API validates the envelope (`id`, a known
 * `type`, an object `data`) and leaves the per-type shape to the renderer.
 * A malformed block degrades to "unknown block" in the UI rather than a 500.
 */
export class BlockDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsIn(BLOCK_TYPES as unknown as string[], {
    message: "Tip de bloc necunoscut.",
  })
  type: BlockType;

  @IsObject()
  data: Record<string, unknown>;
}
