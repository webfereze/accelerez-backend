/**
 * How long a confirmed period runs.
 *
 * **Twenty-eight days from the confirmation, not to the end of the month.**
 * A calendar month is the wrong unit for this product: a client who pays on the
 * 28th would get three days, and a coach explaining that once is a coach who
 * stops using the product. Four weeks is also how training is actually
 * planned — blocks of four, not "until September ends".
 *
 * The number lives here because three places compute with it — the service that
 * opens a period, the guard that decides access, and the bar that counts the
 * days down — and a 28 typed in three files is a 30 in one of them eventually.
 */
export const PERIOD_DAYS = 28;

/** `YYYY-MM-DD` for a date, in local time — never `toISOString`, which is UTC
 * and shifts the day backwards for anybody east of Greenwich in the evening. */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses `YYYY-MM-DD` as a local date at midnight. */
export function fromDateString(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function addDays(value: string, days: number): string {
  const date = fromDateString(value);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/**
 * The last day a period covers, **inclusive**.
 *
 * A 28-day period starting on the 1st ends on the 28th, not the 29th — so the
 * arithmetic is `+27`. Off by one here is a free day for every client, every
 * period, forever.
 */
export function periodEnd(startsOn: string): string {
  return addDays(startsOn, PERIOD_DAYS - 1);
}

/** Whole days between two `YYYY-MM-DD` dates, inclusive of both ends. */
export function daysBetween(from: string, to: string): number {
  const ms = fromDateString(to).getTime() - fromDateString(from).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * The next time a weekly class runs, from a set of weekdays and a clock time.
 *
 * ISO weekdays — 1 is Monday, 7 is Sunday — and today counts if the class has
 * not started yet. Somebody looking at this at nine in the morning on a class
 * day wants to be told about tonight, not about next week.
 *
 * Returns null when the class has no structured schedule, which is a real
 * state: a class can be described in a sentence and never gain weekdays, and a
 * guessed date is worse than none.
 */
export function nextOccurrence(
  weekdays: number[] | null | undefined,
  startTime: string | null | undefined,
  from: Date = new Date(),
): Date | null {
  if (!weekdays?.length || !startTime) return null;

  const [hours, minutes] = startTime.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const wanted = new Set(weekdays.filter((day) => day >= 1 && day <= 7));
  if (!wanted.size) return null;

  // Fourteen rather than seven: a class every Monday, looked at on a Monday
  // evening after it has finished, is next week's — and the seventh step would
  // land on today again and be rejected.
  for (let step = 0; step <= 14; step += 1) {
    const day = new Date(from);
    day.setDate(day.getDate() + step);
    day.setHours(hours, minutes, 0, 0);

    // `getDay()` is Sunday-zero; ISO puts Sunday last.
    const iso = day.getDay() === 0 ? 7 : day.getDay();

    if (wanted.has(iso) && day.getTime() > from.getTime()) return day;
  }

  return null;
}

/**
 * Every time a weekly class runs inside a window.
 *
 * The agenda screen needs the same arithmetic `nextOccurrence` does, but for a
 * fortnight rather than for the next one — so it is here, beside it, and the
 * two cannot drift apart.
 *
 * `notBefore` is the class's own start date: a series that begins in October
 * must not appear on this week's agenda just because it runs on Tuesdays.
 */
export function occurrencesBetween(
  weekdays: number[] | null | undefined,
  startTime: string | null | undefined,
  options: { from: Date; days: number; notBefore?: string | null },
): Date[] {
  if (!weekdays?.length || !startTime) return [];

  const [hours, minutes] = startTime.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return [];

  const wanted = new Set(weekdays.filter((day) => day >= 1 && day <= 7));
  if (!wanted.size) return [];

  const floor = options.notBefore ? fromDateString(options.notBefore).getTime() : 0;
  const out: Date[] = [];

  for (let step = 0; step < options.days; step += 1) {
    const day = new Date(options.from);
    day.setDate(day.getDate() + step);
    day.setHours(hours, minutes, 0, 0);

    const iso = day.getDay() === 0 ? 7 : day.getDay();
    if (!wanted.has(iso)) continue;

    // A class that has already finished today is not on today's agenda, and a
    // class whose series has not opened yet is on nobody's.
    if (day.getTime() <= options.from.getTime()) continue;
    if (day.getTime() < floor) continue;

    out.push(day);
  }

  return out;
}
