/**
 * Who someone is on this platform.
 *
 * One `users` table holds all four — a trainer and a client sign in at the same
 * address with the same token format, and the role decides which portal they
 * land in. Separate tables would mean two login flows, two password resets and
 * an e-mail address that can exist twice with different passwords.
 *
 * **Roles are assigned, never chosen.** Registration creates a `CLIENT` and
 * nothing else; a `TRAINER` account is created by an administrator, which is
 * the whole admission model of the product. A self-service "I am a trainer"
 * checkbox on a sign-up form is how a directory of vetted coaches becomes a
 * directory of anyone.
 */
export enum UserRole {
  /** Full access to every admin screen, and the only role that creates trainers. */
  ADMIN = "admin",
  /** Manages site content — no users, no trainers, no settings. */
  EDITOR = "editor",
  /** Has a public profile, clients of their own, and their own portal. */
  TRAINER = "trainer",
  /** Someone training with a trainer. The account registration creates. */
  CLIENT = "client",
}

/** Back-office accounts: the roles `StaffGuard` lets into `/admin`. */
export const STAFF_ROLES = [UserRole.ADMIN, UserRole.EDITOR];

/** Portal accounts: the roles that sign in at the public login. */
export const PORTAL_ROLES = [UserRole.TRAINER, UserRole.CLIENT];
