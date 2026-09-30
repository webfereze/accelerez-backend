import type { Translated } from "@shared/types/translated";

/** The distinct menus on the site. */
export enum MenuKey {
  /** The header navigation. */
  MAIN = "main",
  /** Shortcut buttons beside it. */
  QUICK = "quick",
  FOOTER = "footer",
}

/** What a menu entry points at. */
export enum MenuLinkType {
  /** An editor-built content page. */
  PAGE = "page",
  /** Any absolute or relative URL — a social profile, a partner, a PDF. */
  URL = "url",
  /**
   * A built-in section of the site. These are routes in the app, not editable
   * pages, so an editor picks them by name instead of having to know and
   * retype the path.
   */
  SYSTEM = "system",
  /** A heading that groups children without being clickable itself. */
  HEADING = "heading",
}

/** The sections a `SYSTEM` menu entry can point at. */
export enum SystemSection {
  HOME = "home",
  TRAINERS = "trainers",
  CLASSES = "classes",
  SHOP = "shop",
  HOW_IT_WORKS = "how_it_works",
  BLOG = "blog",
  CONTACT = "contact",
  PORTAL = "portal",
}

/**
 * Where each section lives, and what it is called when an editor gives no
 * label of their own.
 *
 * Listed here rather than typed into a menu entry so a route rename is one
 * edit. The label is `Translated` because a menu is read by visitors, and the
 * default has to be right in every language the site serves.
 */
export const SYSTEM_SECTIONS: Record<
  SystemSection,
  { href: string; label: Translated }
> = {
  [SystemSection.HOME]: {
    href: "/",
    label: { ro: "Acasă", hu: "Főoldal", en: "Home" },
  },
  [SystemSection.TRAINERS]: {
    href: "/antrenori",
    label: { ro: "Antrenori", hu: "Edzők", en: "Trainers" },
  },
  [SystemSection.CLASSES]: {
    href: "/clase",
    label: { ro: "Clase", hu: "Órák", en: "Classes" },
  },
  [SystemSection.SHOP]: {
    href: "/magazin",
    label: { ro: "Magazin", hu: "Webshop", en: "Shop" },
  },
  [SystemSection.HOW_IT_WORKS]: {
    href: "/cum-functioneaza",
    label: { ro: "Cum funcționează", hu: "Hogyan működik", en: "How it works" },
  },
  [SystemSection.BLOG]: {
    href: "/blog",
    label: { ro: "Blog", hu: "Blog", en: "Blog" },
  },
  [SystemSection.CONTACT]: {
    href: "/contact",
    label: { ro: "Contact", hu: "Kapcsolat", en: "Contact" },
  },
  [SystemSection.PORTAL]: {
    href: "/cont",
    label: { ro: "Contul meu", hu: "Fiókom", en: "My account" },
  },
};
