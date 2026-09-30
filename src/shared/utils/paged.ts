import type { SelectQueryBuilder } from "typeorm";

/**
 * What every admin list endpoint answers.
 *
 * The shape `usePagedList` on the front end expects. One envelope, declared
 * once, so a fourth list screen cannot invent a fifth field name.
 */
export type Paged<T> = {
  rows: T[];
  total: number;
  page: number;
  perPage: number;
};

/** Clamped so a crafted `?perPage=100000` cannot ask for the whole table. */
export function pageParams(query: { page?: number; perPage?: number }) {
  const perPage = Math.min(Math.max(Number(query.perPage) || 25, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);

  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

/**
 * Runs a query builder as one page and returns the envelope.
 *
 * `getManyAndCount` rather than two queries: the count has to be of the same
 * filtered set, and running it separately is how a list ends up saying "84
 * results" over a page of three.
 */
export async function paginate<T extends object>(
  query: SelectQueryBuilder<T>,
  params: { page?: number; perPage?: number },
): Promise<Paged<T>> {
  const { page, perPage, skip, take } = pageParams(params);
  const [rows, total] = await query.skip(skip).take(take).getManyAndCount();

  return { rows, total, page, perPage };
}

/**
 * A `LIKE` term for searching a `Translated` column.
 *
 * Used with `JSON_VALUE(col, '$.ro')` — never against the raw JSON, or a search
 * for "ro" matches every row in the table through the keys.
 */
export function searchTerm(q?: string): string | null {
  const trimmed = (q ?? "").trim();
  return trimmed ? `%${trimmed}%` : null;
}
