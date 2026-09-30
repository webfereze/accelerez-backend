import type { DataSource } from "typeorm";
import { MenuItemEntity } from "@shared/entities";
import { MenuKey, MenuLinkType, SystemSection } from "@shared/enums/menu.enum";

/**
 * The two header entries that point at file routes rather than CMS pages:
 * the directory and the blog.
 *
 * **A separate seeder rather than a fix to 005**, which has already run
 * everywhere it was going to: a seeder's name is its key in `seed_history`, so
 * editing one silently does nothing on every database that already has it. The
 * menu seeder wrote the column as `section`; the entity calls it `systemKey`,
 * the value was dropped, and both entries failed the `!!item.systemKey` filter
 * in `MenuService` — which is why the header showed two links instead of four.
 *
 * Idempotent by `systemKey`, so this is safe to leave in the registry.
 */
export async function run(dataSource: DataSource) {
  const items = dataSource.getRepository(MenuItemEntity);

  const wanted = [
    { systemKey: SystemSection.TRAINERS, sortOrder: -2 },
    { systemKey: SystemSection.BLOG, sortOrder: -1 },
  ];

  for (const entry of wanted) {
    const existing = await items.findOne({
      where: { menu: MenuKey.MAIN, systemKey: entry.systemKey },
    });

    if (existing) {
      console.log(`  · ${entry.systemKey} already in the header`);
      continue;
    }

    await items.save(
      items.create({
        menu: MenuKey.MAIN,
        linkType: MenuLinkType.SYSTEM,
        systemKey: entry.systemKey,
        label: null,
        // Negative, so the directory and the blog lead the header without the
        // existing entries having to be renumbered.
        sortOrder: entry.sortOrder,
        isVisible: true,
      } as never),
    );
    console.log(`  · header: ${entry.systemKey}`);
  }
}
