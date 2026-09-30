import type { DataSource } from "typeorm";
import { periodEnd, toDateString } from "@shared/utils/period";

/**
 * Converts the periods written as a calendar month into twenty-eight-day
 * ranges.
 *
 * **A paid period used to be a calendar month**, which meant a client who
 * confirmed on the 28th got three days for a full price. It is now four weeks
 * from where it starts — see `shared/utils/period.ts` — and the rows written
 * before that change have a `year` and a `month` but no dates.
 *
 * Each one starts from the day it was actually paid, where that is known, and
 * otherwise from the first of the month it was recorded against. That is the
 * reading most favourable to the client, which is the right way to resolve an
 * ambiguity the product created.
 *
 * Idempotent: a row that already has `startsOn` is left alone, so this is safe
 * to leave in the registry.
 *
 * **Raw SQL, on purpose.** `year` and `month` were dropped from the entity once
 * every row had been converted, so there is no property to read them through
 * any more — and on a database created after that they do not exist at all,
 * which is why the column is checked for before anything is selected. A
 * historical migration has to keep working on a schema that has moved past it.
 */
export async function run(dataSource: DataSource) {
  const [{ present }] = (await dataSource.query(
    `SELECT COUNT(*) AS present FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'membership_periods'
        AND COLUMN_NAME = 'year'`,
  )) as Array<{ present: number }>;

  if (!Number(present)) {
    console.log("  · no calendar-month columns on this schema — nothing to convert");
    return;
  }

  const rows = (await dataSource.query(
    `SELECT id, year, month, paidAt FROM membership_periods WHERE startsOn IS NULL`,
  )) as Array<{ id: number; year: number | null; month: number | null; paidAt: Date | null }>;

  if (!rows.length) {
    console.log("  · no calendar-month periods left to convert");
    return;
  }

  for (const row of rows) {
    const from = row.paidAt
      ? toDateString(new Date(row.paidAt))
      : toDateString(new Date(row.year ?? 2026, (row.month ?? 1) - 1, 1));

    await dataSource.query(
      `UPDATE membership_periods SET startsOn = ?, endsOn = ? WHERE id = ?`,
      [from, periodEnd(from), row.id],
    );
    console.log(`  · period ${row.id}: ${row.year}/${row.month} → ${from} … ${periodEnd(from)}`);
  }

  console.log(`  · converted ${rows.length} period(s)`);
}
