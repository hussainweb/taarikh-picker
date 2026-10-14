import { weekday } from "../engine/helpers.js";
import { DEFAULT_MONTH_LABELS, type MonthLabels, getMonthName } from "../engine/labels.js";
import type { CalendarEngine, PlainDate } from "../engine/types.js";
import type { DisplayOptions, WeekdayLabels } from "./types.js";

// Cache for Intl formatters to avoid expensive re-instantiation on every cell render
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Reset all cached Intl formatters (useful for tests).
 */
export function clearFormatterCache(): void {
  dateTimeFormatterCache.clear();
  numberFormatterCache.clear();
}

/**
 * Return a cached Intl.DateTimeFormat instance.
 */
export function getDateTimeFormatter(
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale ?? ""}|${options?.weekday ?? ""}|${options?.year ?? ""}|${options?.month ?? ""}|${options?.day ?? ""}|${options?.timeZone ?? "UTC"}`;
  let formatter = dateTimeFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateTimeFormatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Return a cached Intl.NumberFormat instance.
 */
export function getNumberFormatter(
  locale?: string,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale ?? ""}|${options?.useGrouping ?? false}|${options?.minimumIntegerDigits ?? 1}`;
  let formatter = numberFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Format a calendar year number using localized numerals for the given locale.
 */
export function formatYear(year: number, locale?: string): string {
  const numFmt = getNumberFormatter(locale, { useGrouping: false });
  return numFmt.format(year);
}

/**
 * Detect whether a locale uses Arabic comma ("، ", U+060C) as a separator.
 * Accurately covers Arabic (ar), Persian (fa), Urdu (ur), Pashto (ps), Uyghur (ug),
 * Sindhi (sd), Kurdish (ckb), and other Arabic-script languages without false-matching 'arn' (Mapudungun).
 */
export function isArabicScriptLocale(locale?: string): boolean {
  if (!locale) {
    return false;
  }
  try {
    const loc = new Intl.Locale(locale);
    const lang = loc.language.toLowerCase();
    const script = loc.script?.toLowerCase();
    if (script === "arab") {
      return true;
    }
    const arabicScriptLanguages = [
      "ar",
      "fa",
      "ur",
      "ps",
      "ug",
      "sd",
      "ckb",
      "ks",
      "prs",
      "mzn",
      "glk",
      "pnb",
      "azb",
    ];
    if (arabicScriptLanguages.includes(lang)) {
      return true;
    }
  } catch {
    const lang = locale.split(/[-_]/)[0]?.toLowerCase();
    const arabicScriptLanguages = [
      "ar",
      "fa",
      "ur",
      "ps",
      "ug",
      "sd",
      "ckb",
      "ks",
      "prs",
      "mzn",
      "glk",
      "pnb",
      "azb",
    ];
    if (lang && arabicScriptLanguages.includes(lang)) {
      return true;
    }
  }
  return false;
}

/**
 * Infer the component order ('dmy', 'mdy', or 'ymd') for a given locale.
 * Defaults to 'dmy' for English/fallback (matching standard Hijri date conventions in English).
 */
export function inferDateOrder(locale?: string): "dmy" | "mdy" | "ymd" {
  if (!locale || locale === "en") {
    return "dmy";
  }
  try {
    const dtf = getDateTimeFormatter(locale, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    });
    // 2026-04-20
    const sample = new Date(Date.UTC(2026, 3, 20, 12, 0, 0));
    const parts = dtf.formatToParts(sample);
    let dayIdx = -1;
    let monthIdx = -1;
    let yearIdx = -1;
    for (let i = 0; i < parts.length; i++) {
      const type = parts[i]?.type;
      if (type === "day") dayIdx = i;
      else if (type === "month") monthIdx = i;
      else if (type === "year") yearIdx = i;
    }
    if (yearIdx !== -1 && yearIdx < monthIdx && monthIdx < dayIdx) {
      return "ymd";
    }
    if (monthIdx !== -1 && monthIdx < dayIdx) {
      return "mdy";
    }
  } catch {
    // Fallback to dmy
  }
  return "dmy";
}

/**
 * Return localized weekday names for the civil week using Intl.DateTimeFormat or custom labels.
 *
 * @param locale BCP 47 locale tag (default: system / undefined)
 * @param format 'long', 'short', 'narrow', or 'min' (alias for narrow)
 * @param firstDay First day of week index: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (default: 0)
 * @param customWeekdays Optional custom weekday names array or dictionary
 * @returns Array of 7 localized weekday names
 */
export function getWeekdayNames(
  locale?: string,
  format: "long" | "short" | "narrow" | "min" = "narrow",
  firstDay: number = 0,
  customWeekdays?: WeekdayLabels | readonly string[],
): string[] {
  const normFormat: "long" | "short" | "narrow" = format === "min" ? "narrow" : format;
  const names: string[] = [];

  // 1. If customWeekdays dictionary is provided
  if (customWeekdays) {
    let list: readonly string[] | undefined;
    if (Array.isArray(customWeekdays)) {
      list = customWeekdays;
    } else {
      const obj = customWeekdays as WeekdayLabels;
      if (normFormat === "long") {
        list = obj.long ?? obj.short ?? obj.narrow ?? obj.min;
      } else if (normFormat === "short") {
        list = obj.short ?? obj.min ?? obj.narrow ?? obj.long;
      } else {
        list = obj.narrow ?? obj.min ?? obj.short ?? obj.long;
      }
    }
    if (list && list.length === 7) {
      for (let i = 0; i < 7; i++) {
        const dayIndex = (((firstDay + i) % 7) + 7) % 7;
        names.push(list[dayIndex] ?? "");
      }
      return names;
    }
  }

  // 2. Use cached Intl.DateTimeFormat
  const dtf = getDateTimeFormatter(locale, {
    weekday: normFormat,
    timeZone: "UTC",
  });

  for (let i = 0; i < 7; i++) {
    const dayIndex = (((firstDay + i) % 7) + 7) % 7;
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
 * - Uses cached Intl.DateTimeFormat for localized weekday names
 * - Uses cached Intl.NumberFormat for numerals in the chosen locale
 * - Uses the labels dictionary for month names
 * - Avoids hardcoded day-month-year order or simplistic locale detection
 *
 * @param date Civil date to format
 * @param engine CalendarEngine used to compute day of week
 * @param options Display options (locale, weekday, month, year, day, custom labels, order, separator)
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

  // 1. Weekday name (custom or cached Intl)
  let weekdayStr = "";
  if (weekdayOption) {
    const w = weekday(date, engine);
    if (options?.weekdays) {
      const names = getWeekdayNames(locale, weekdayOption, 0, options.weekdays);
      weekdayStr = names[w] ?? "";
    } else {
      const sampleDate = new Date(Date.UTC(2026, 0, 4 + w, 12, 0, 0));
      const dtf = getDateTimeFormatter(locale, {
        weekday: weekdayOption === "min" ? "narrow" : weekdayOption,
        timeZone: "UTC",
      });
      weekdayStr = dtf.format(sampleDate);
    }
  }

  // 2. Month name (labels pack)
  const monthStr = getMonthName(date.month, monthFormat, labels);

  // 3. Day of month (cached Intl numerals)
  let dayStr = "";
  if (dayOption === "numeric") {
    const numFmt = getNumberFormatter(locale, { useGrouping: false });
    dayStr = numFmt.format(date.day);
  } else if (dayOption === "2-digit") {
    const numFmt = getNumberFormatter(locale, {
      minimumIntegerDigits: 2,
      useGrouping: false,
    });
    dayStr = numFmt.format(date.day);
  }

  // 4. Year (cached Intl numerals)
  let yearStr = "";
  if (yearOption === "numeric") {
    const numFmt = getNumberFormatter(locale, { useGrouping: false });
    yearStr = numFmt.format(date.year);
  } else if (yearOption === "2-digit") {
    const numFmt = getNumberFormatter(locale, {
      minimumIntegerDigits: 2,
      useGrouping: false,
    });
    const twoDigitYear = Math.abs(date.year) % 100;
    yearStr = numFmt.format(twoDigitYear);
  }

  // Assemble date parts according to resolved order
  const order = options?.order ?? inferDateOrder(locale);
  const dateParts: string[] = [];

  if (order === "ymd") {
    if (yearStr) dateParts.push(yearStr);
    if (monthStr) dateParts.push(monthStr);
    if (dayStr) dateParts.push(dayStr);
  } else if (order === "mdy") {
    if (monthStr) dateParts.push(monthStr);
    if (dayStr) dateParts.push(dayStr);
    if (yearStr) dateParts.push(yearStr);
  } else {
    // "dmy" default
    if (dayStr) dateParts.push(dayStr);
    if (monthStr) dateParts.push(monthStr);
    if (yearStr) dateParts.push(yearStr);
  }

  const datePart = dateParts.join(" ");

  if (weekdayStr && datePart) {
    const separator = options?.separator ?? (isArabicScriptLocale(locale) ? "، " : ", ");
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
  locale?: string | undefined,
  labels?: MonthLabels | undefined,
  weekdays?: WeekdayLabels | readonly string[] | undefined,
  order?: "dmy" | "mdy" | "ymd" | undefined,
): string {
  return formatDisplay(date, engine, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    locale,
    labels,
    weekdays,
    order,
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
    readonly month?: "long" | "short" | undefined;
    readonly locale?: string | undefined;
    readonly labels?: MonthLabels | undefined;
    readonly order?: "dmy" | "mdy" | "ymd" | undefined;
  },
): string {
  return formatDisplay(date, engine, {
    day: false,
    month: options?.month ?? "long",
    year: "numeric",
    locale: options?.locale,
    labels: options?.labels,
    order: options?.order,
  });
}
