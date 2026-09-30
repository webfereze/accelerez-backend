import type { DataSource } from "typeorm";
import { UserEntity } from "@shared/entities";
import { assignSlug } from "@shared/utils/user-slug";

/**
 * Gives every existing account the handle its addresses now use.
 *
 * The portal used to address people by id — `/cont/3`, `/antrenor/cursanti/3`.
 * An id in a URL invites somebody to try the next number, and leaks how many
 * accounts exist and in what order they were created, even though every route
 * resolves ownership from the token and refuses them.
 *
 * Idempotent: an account that already has a slug is skipped.
 */
export async function run(dataSource: DataSource) {
  const users = dataSource.getRepository(UserEntity);

  const rows = await users.createQueryBuilder("u").where("u.slug IS NULL").getMany();
  if (!rows.length) {
    console.log("  · every account already has a handle");
    return;
  }

  for (const user of rows) {
    const slug = await assignSlug(users, user);
    await users.update(user.id, { slug });
    console.log(`  · ${user.email} → ${slug}`);
  }
}
