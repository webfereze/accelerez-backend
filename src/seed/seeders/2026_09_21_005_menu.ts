import type { DataSource } from "typeorm";
import { MenuItemEntity, PageEntity } from "@shared/entities";
import { MenuKey, MenuLinkType, SystemSection } from "@shared/enums/menu.enum";

/**
 * The header and footer menus.
 *
 * **Four items in the header, and the fifth is not a menu item.** "Caută
 * antrenor" and "Intră în cont" are buttons in the layout, not navigation: a
 * call to action that sits in the same list as "Despre noi" reads as another
 * page and gets the same amount of attention, which is none.
 *
 * Labels are left null wherever the entry points at a content page, so each
 * falls back to that page's own title — renaming a page renames its menu entry,
 * in all three languages at once, rather than leaving a stale label behind.
 *
 * Idempotent per menu rather than per row: a menu an editor has already
 * arranged should not gain seeded entries at the bottom of it.
 */

// NOTE: the column is `systemKey`, not `section` — see seeder 010.
const HEADER: Array<
  | { kind: "system"; section: SystemSection }
  | { kind: "page"; slug: string }
> = [
  { kind: "system", section: SystemSection.TRAINERS },
  { kind: "page", slug: "cum-functioneaza" },
  { kind: "system", section: SystemSection.BLOG },
  { kind: "page", slug: "despre-noi" },
];

const FOOTER = ["cum-functioneaza", "despre-noi", "contact", "termeni-si-conditii", "confidentialitate", "cookie-uri"];

export async function run(dataSource: DataSource) {
  const items = dataSource.getRepository(MenuItemEntity);
  const pages = dataSource.getRepository(PageEntity);

  if (await items.findOne({ where: { menu: MenuKey.MAIN } })) {
    console.log("main menu already has entries — left alone");
  } else {
    let order = 0;

    for (const entry of HEADER) {
      if (entry.kind === "system") {
        await items.save(
          items.create({
            menu: MenuKey.MAIN,
            linkType: MenuLinkType.SYSTEM,
            section: entry.section,
            label: null,
            sortOrder: order++,
            isVisible: true,
          } as never),
        );
        continue;
      }

      const page = await pages.findOne({ where: { slug: entry.slug } });
      if (!page) {
        console.log(`  · /${entry.slug} missing — header entry skipped`);
        continue;
      }

      await items.save(
        items.create({
          menu: MenuKey.MAIN,
          linkType: MenuLinkType.PAGE,
          pageId: page.id,
          label: null,
          sortOrder: order++,
          isVisible: true,
        } as never),
      );
    }

    console.log(`  · header menu: ${order} entries`);
  }

  if (await items.findOne({ where: { menu: MenuKey.FOOTER } })) {
    console.log("footer menu already has entries — left alone");
    return;
  }

  let order = 0;
  for (const slug of FOOTER) {
    const page = await pages.findOne({ where: { slug } });
    if (!page) continue;

    await items.save(
      items.create({
        menu: MenuKey.FOOTER,
        linkType: MenuLinkType.PAGE,
        pageId: page.id,
        label: null,
        sortOrder: order++,
        isVisible: true,
      } as never),
    );
  }
  console.log(`  · footer menu: ${order} entries`);
}
