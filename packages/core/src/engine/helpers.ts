import type { CalendarEngine, PlainDate } from "./types.js";

/**
 * Return civil day of the week from Julian Day Number (JDN).
 *
 * Mapping: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 * JDN 0 was a Monday in the proleptic Julian calendar.
 * Canonical formula: ((jdn + 1) % 7 + 7) % 7.
 */
export function weekdayFromJdn(jdn: number): number {
  const floored = Math.floor(jdn);
  return (((floored + 1) % 7) + 7) % 7;
}

/**
 * Return civil day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
 * Accepts either an integer Julian Day Number (JDN) or a PlainDate with its CalendarEngine.
 */
export function weekday(jdn: number): number;
export function weekday(date: PlainDate, engine: CalendarEngine): number;
export function weekday(dateOrJdn: PlainDate | number, engine?: CalendarEngine): number {
  if (typeof dateOrJdn === "number") {
    return weekdayFromJdn(dateOrJdn);
  }
  if (!engine) {
    throw new TypeError("CalendarEngine is required when passing a PlainDate to weekday()");
  }
  return weekdayFromJdn(engine.toJulianDay(dateOrJdn));
}

/**
 * Convert a Gregorian civil date to Julian Day Number (JDN).
 * Standard astronomical formula (Fliegel & Van Flandern, 1968).
 *
 * @param year Gregorian year (e.g. 2026)
 * @param month Gregorian month (1-12)
 * @param day Gregorian day of month (1-31)
 */
export function gregorianToJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * Add or subtract days to a date using JDN conversion via the engine.
 */
export function addDays(date: PlainDate, days: number, engine: CalendarEngine): PlainDate {
  const jdn = engine.toJulianDay(date);
  return engine.fromJulianDay(jdn + Math.trunc(days));
}

/**
 * Add or subtract months to a date, clamping the day to the target month's daysInMonth.
 * Accounts for calendar engines where monthsInYear varies across years.
 */
export function addMonths(date: PlainDate, months: number, engine: CalendarEngine): PlainDate {
  let year = date.year;
  let month = date.month;
  let remaining = Math.trunc(months);

  if (remaining > 0) {
    while (remaining > 0) {
      const monthsInCurrentYear = engine.monthsInYear(year);
      const monthsLeftInYear = monthsInCurrentYear - month;
      if (remaining <= monthsLeftInYear) {
        month += remaining;
        remaining = 0;
      } else {
        remaining -= monthsLeftInYear + 1;
        year += 1;
        month = 1;
      }
    }
  } else if (remaining < 0) {
    let negRemaining = -remaining;
    while (negRemaining > 0) {
      const monthsBeforeInYear = month - 1;
      if (negRemaining <= monthsBeforeInYear) {
        month -= negRemaining;
        negRemaining = 0;
      } else {
        negRemaining -= monthsBeforeInYear + 1;
        year -= 1;
        month = engine.monthsInYear(year);
      }
    }
  }

  const maxDays = engine.daysInMonth(year, month);
  const day = Math.max(1, Math.min(date.day, maxDays));
  return { year, month, day };
}

/**
 * Add or subtract years to a date, clamping the day to the target month's daysInMonth.
 */
export function addYears(date: PlainDate, years: number, engine: CalendarEngine): PlainDate {
  const targetYear = date.year + Math.trunc(years);
  const maxMonths = engine.monthsInYear(targetYear);
  const targetMonth = Math.min(date.month, maxMonths);
  const maxDays = engine.daysInMonth(targetYear, targetMonth);
  const day = Math.max(1, Math.min(date.day, maxDays));
  return { year: targetYear, month: targetMonth, day };
}

/**
 * Compare two dates chronologically.
 *
 * @returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export function compareDates(a: PlainDate, b: PlainDate): number {
  if (a.year !== b.year) {
    return a.year < b.year ? -1 : 1;
  }
  if (a.month !== b.month) {
    return a.month < b.month ? -1 : 1;
  }
  if (a.day !== b.day) {
    return a.day < b.day ? -1 : 1;
  }
  return 0;
}

/**
 * Returns true if both dates represent the same year, month, and day.
 */
export function isSameDay(a: PlainDate, b: PlainDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * Returns true if date `a` is strictly before date `b`.
 */
export function isBefore(a: PlainDate, b: PlainDate): boolean {
  return compareDates(a, b) < 0;
}

/**
 * Returns true if date `a` is strictly after date `b`.
 */
export function isAfter(a: PlainDate, b: PlainDate): boolean {
  return compareDates(a, b) > 0;
}

/**
 * Return today's local civil date converted to the calendar engine.
 * Converts the current local civil Gregorian date to JDN, then calls engine.fromJulianDay(jdn).
 */
export function today(engine: CalendarEngine, date: Date = new Date()): PlainDate {
  const jdn = gregorianToJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return engine.fromJulianDay(jdn);
}
