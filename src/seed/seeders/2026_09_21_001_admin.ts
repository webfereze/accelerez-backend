import type { DataSource } from "typeorm";
import * as bcrypt from "bcryptjs";
import { UserEntity } from "@shared/entities";
import { UserRole } from "@shared/enums/user-role.enum";

/**
 * The first administrator, so a fresh database can be signed into.
 *
 * **This is the only account that can create a trainer.** Registration on the
 * public site creates clients and nothing else, so without this row the
 * platform has no way to admit its first coach.
 *
 * The default password satisfies the six-character minimum `LoginDto`
 * enforces — a shorter one seeds fine and then cannot be used to sign in, which
 * reads as a broken login rather than a rejected password.
 *
 * Idempotent by e-mail: run again and it resets that account's password rather
 * than failing on the unique index. That is deliberate — it doubles as the way
 * back in when somebody is locked out.
 *
 *   yarn seed:admin
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… yarn seed:admin
 */
export async function run(dataSource: DataSource) {
  const email = process.env.ADMIN_EMAIL ?? "admin@accelerez.ro";
  const password = process.env.ADMIN_PASSWORD ?? "accelerez";

  const users = dataSource.getRepository(UserEntity);
  const hash = await bcrypt.hash(password, 10);
  const existing = await users.findOne({ where: { email } });

  if (existing) {
    await users.update(existing.id, {
      password: hash,
      role: UserRole.ADMIN,
      isActive: true,
    });
    console.log(`Updated admin ${email}`);
    return;
  }

  await users.save(
    users.create({
      email,
      password: hash,
      firstName: "Accelerez",
      lastName: "Admin",
      role: UserRole.ADMIN,
      locale: "ro",
    }),
  );
  console.log(`Created admin ${email}`);
}
