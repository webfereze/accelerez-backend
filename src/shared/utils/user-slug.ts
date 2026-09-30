import type { Repository } from "typeorm";
import { UserEntity } from "@shared/entities";
import { slugify } from "./slugify";

/**
 * A URL handle for a person: `maria-ionescu`, `maria-ionescu-2`.
 *
 * Built from the name rather than the e-mail address, because the handle
 * appears in a trainer's address bar and an e-mail address in a URL is a piece
 * of personal data handed to every browser history, proxy log and screenshot.
 *
 * Falls back to the e-mail's local part only when there is no name at all, and
 * to `client` when even that slugifies to nothing — an account with no readable
 * handle is still an account that has to be addressable.
 */
export async function assignSlug(
  users: Repository<UserEntity>,
  user: { firstName?: string | null; lastName?: string | null; email: string },
): Promise<string> {
  const fromName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const base =
    slugify(fromName) || slugify(user.email.split("@")[0] ?? "") || "cursant";

  // A handful of probes rather than a `LIKE` scan: collisions are rare, and the
  // scan would be over every account on the platform to serve the rare case.
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    if (!(await users.findOne({ where: { slug: candidate }, select: ["id"] }))) {
      return candidate;
    }
  }

  // Beyond that, stop guessing: a random tail is ugly and always free.
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
