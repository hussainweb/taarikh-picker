import { weekday } from "../engine/helpers.js";
import { DEFAULT_MONTH_LABELS, type MonthLabels, getMonthName } from "../engine/labels.js";
import type { CalendarEngine, PlainDate } from "../engine/types.js";
import type { DisplayOptions } from "./types.js";

/**
 * Return localized weekday names for the civil week using Intl.DateTimeFormat.
 *
 * @param locale BCP 47 locale tag (default: system / undefined)
 * @param format 'long' (e.g. 'Sunday'), 'short' (e.g. 'Sun'), or 'narrow' (e.g. 'S')
 * @param firstDay First day of week index: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (default: 0)
 * @returns Array of 7 localized weekday names
 */
export function getWeekdayNames(
  locale?: string,
  format: "long" | "short" | "narrow" = "narrow",
  firstDay: number = 0,
): string[] {
  const dtf = new Intl.DateTimeFormat(locale, {
    weekday: format,
    timeZone: "UTC",
  });

  const names: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dayIndex = (firstDay + i) % 7;
    // 2026-01-04 is a Sunday (dayIndex = 0)
    const sampleDate = new Date(Date.UTC(2026, 0, 4 + dayIndex, 12, 0, 0));
    names.push(dtf.format(sampleDate));
  }
  return names;
}

/**
 * Format a civil PlainDate for UI display.
 *
 * Strictly separates display concerns from submitted values:
 * - Uses Intl.DateTimeFormat for localized weekday names
 * - Uses Intl.NumberFormat for numerals in the chosen locale
 * - Uses the labels dictionary for month names
 *
 * @param date Civil date to format
 * @param engine CalendarEngine used to compute day of week
 * @param options Display options (locale, weekday, month, year, day, custom labels)
 */
export function formatDisplay(
  date: PlainDate,
  engine: CalendarEngine,
  options?: DisplayOptions,
): string {
  const locale = options?.locale;
  const labels: MonthLabels = options?.labels ?? DEFAULT_MONTH_LABELS;
  const monthFormat = options?.month ?? "long";
  const dayOption = options?.day ?? "numeric";
  const yearOption = options?.year ?? "numeric";
  const weekdayOption = options?.weekday;

  // 1. Weekday name (Intl)
  let weekdayStr = "";
  if (weekdayOption) {
    const w = weekday(date, engine);
    const sampleDate = new Date(Date.UTC(2026, 0, 4 + w, 12, 0, 0));
    const dtf = new Intl.DateTimeFormat(locale, {
      weekday: weekdayOption,
      timeZone: "UTC",
    });
    weekdayStr = dtf.format(sampleDate);
  }

  // 2. Month name (labels pack)
  const monthStr = getMonthName(date.month, monthFormat, labels);

  // 3. Day of month (Intl numerals)
  let dayStr = "";
  if (dayOption === "numeric") {
    const numFmt = new Intl.NumberFormat(locale, { useGrouping: false });
    dayStr = numFmt.format(date.day);
  } else if (dayOption === "2-digit") {
    const numFmt = new Intl.NumberFormat(locale, {
      minimumIntegerDigits: 2,
      useGrouping: false,
    });
    dayStr = numFmt.format(date.day);
  }

  // 4. Year (Intl numerals)
  let yearStr = "";
  if (yearOption === "numeric") {
    const numFmt = new Intl.NumberFormat(locale, { useGrouping: false });
    yearStr = numFmt.format(date.year);
  } else if (yearOption === "2-digit") {
    const numFmt = new Intl.NumberFormat(locale, {
      minimumIntegerDigits: 2,
      useGrouping: false,
    });
    const twoDigitYear = Math.abs(date.year) % 100;
    yearStr = numFmt.format(twoDigitYear);
  }

  // Assemble date part
  const dateParts: string[] = [];
  if (dayStr) dateParts.push(dayStr);
  if (monthStr) dateParts.push(monthStr);
  if (yearStr) dateParts.push(yearStr);
  const datePart = dateParts.join(" ");

  if (weekdayStr && datePart) {
    const separator = locale && locale.startsWith("ar") ? "، " : ", ";
    return `${weekdayStr}${separator}${datePart}`;
  }
  if (weekdayStr) {
    return weekdayStr;
  }
  return datePart;
}

/**
 * Format a full accessible ARIA label for a calendar grid day cell.
 * E.g. "Friday, 1 Ramadan al-Moazzam 1445"
 */
export function formatDayAriaLabel(
  date: PlainDate,
  engine: CalendarEngine,
  locale?: string,
  labels?: MonthLabels,
): string {
  return formatDisplay(date, engine, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    locale,
    labels,
  });
}

/**
 * Format a heading label for month navigation views.
 * E.g. "Ramadan al-Moazzam 1445"
 */
export function formatMonthHeading(
  date: PlainDate,
  engine: CalendarEngine,
  options?: {
    month?: "long" | "short";
    locale?: string;
    labels?: MonthLabels;
  },
): string {
  return formatDisplay(date, engine, {
    day: false,
    month: options?.month ?? "long",
    year: "numeric",
    locale: options?.locale,
    labels: options?.labels,
  });
}
