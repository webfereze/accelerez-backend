import type { DataSource } from "typeorm";
import { MenuItemEntity } from "@shared/entities";
import { MenuKey, MenuLinkType, SystemSection } from "@shared/enums/menu.enum";

/**
 * Classes, in the header, beside the trainers.
 *
 * A separate seeder rather than an edit to the menu seeders that have already
 * run: a seeder's name is its key in `seed_history`, so editing one changes
 * nothing on a database that already has it.
 *
 * Idempotent by `systemKey`.
 */
export async function run(dataSource: DataSource) {
  const items = dataSource.getRepository(MenuItemEntity);

  const existing = await items.findOne({
    where: { menu: MenuKey.MAIN, systemKey: SystemSection.CLASSES },
  });

  if (existing) {
    console.log("  · classes already in the header");
    return;
  }

  await items.save(
    items.create({
      menu: MenuKey.MAIN,
      linkType: MenuLinkType.SYSTEM,
      systemKey: SystemSection.CLASSES,
      label: null,
      // Right after the trainers, which sit at -2: somebody who has just
      // decided against one-to-one is the reader a group class is for.
      sortOrder: -1.5 as never,
      isVisible: true,
    } as never),
  );
  console.log("  · header: classes");
}
