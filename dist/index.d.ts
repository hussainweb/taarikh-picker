//#region src/engine/types.d.ts
/**
 * A calendar-independent representation of a civil date.
 *
 * Year, month, and day are pure integers without time, timezone, or locale.
 * Months and days are 1-indexed. Years are astronomical (year 0 exists).
 */
interface PlainDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}
/**
 * Pluggable calendar engine interface based on Julian Day Number (JDN) conversions.
 *
 * Decouples the datepicker UI and arithmetic from Gregorian calendar assumptions.
 * All calendar math is pure arithmetic with zero runtime dependencies.
 */
interface CalendarEngine {
  /**
   * Unique identifier of the engine (e.g. 'fatimid-astronomical').
   */
  readonly id: string;
  /**
   * Number of months in the given year.
   * Allows supporting calendars with varying month counts (e.g. leap months).
   */
  monthsInYear(year: number): number;
  /**
   * Number of days in the given month of the given year.
   */
  daysInMonth(year: number, month: number): number;
  /**
   * Convert a PlainDate to an integer Julian Day Number (JDN).
   */
  toJulianDay(date: PlainDate): number;
  /**
   * Convert an integer Julian Day Number (JDN) to a PlainDate.
   */
  fromJulianDay(jdn: number): PlainDate;
}
//#endregion
//#region src/engine/helpers.d.ts
/**
 * Return civil day of the week from Julian Day Number (JDN).
 *
 * Mapping: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 * JDN 0 was a Monday in the proleptic Julian calendar.
 * Canonical formula: ((jdn + 1) % 7 + 7) % 7.
 */
export declare function weekdayFromJdn(jdn: number): number;
/**
 * Return civil day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
 * Accepts either an integer Julian Day Number (JDN) or a PlainDate with its CalendarEngine.
 */
export declare function weekday(jdn: number): number;
export declare function weekday(date: PlainDate, engine: CalendarEngine): number;
/**
 * Convert a Gregorian civil date to Julian Day Number (JDN).
 * Standard astronomical formula (Fliegel & Van Flandern, 1968).
 *
 * @param year Gregorian year (e.g. 2026)
 * @param month Gregorian month (1-12)
 * @param day Gregorian day of month (1-31)
 */
export declare function gregorianToJulianDay(year: number, month: number, day: number): number;
/**
 * Add or subtract days to a date using JDN conversion via the engine.
 */
export declare function addDays(date: PlainDate, days: number, engine: CalendarEngine): PlainDate;
/**
 * Add or subtract months to a date, clamping the day to the target month's daysInMonth.
 * Accounts for calendar engines where monthsInYear varies across years.
 */
export declare function addMonths(date: PlainDate, months: number, engine: CalendarEngine): PlainDate;
/**
 * Add or subtract years to a date, clamping the day to the target month's daysInMonth.
 */
export declare function addYears(date: PlainDate, years: number, engine: CalendarEngine): PlainDate;
/**
 * Compare two dates chronologically.
 *
 * @returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export declare function compareDates(a: PlainDate, b: PlainDate): number;
/**
 * Returns true if both dates represent the same year, month, and day.
 */
export declare function isSameDay(a: PlainDate, b: PlainDate): boolean;
/**
 * Returns true if date `a` is strictly before date `b`.
 */
export declare function isBefore(a: PlainDate, b: PlainDate): boolean;
/**
 * Returns true if date `a` is strictly after date `b`.
 */
export declare function isAfter(a: PlainDate, b: PlainDate): boolean;
/**
 * Return today's local civil date converted to the calendar engine.
 * Converts the current local civil Gregorian date to JDN, then calls engine.fromJulianDay(jdn).
 */
export declare function today(engine: CalendarEngine, date?: Date): PlainDate;
//#endregion
//#region src/engine/fatimid.d.ts
/**
 * Astronomical Fatimid Hijri calendar engine.
 *
 * Direct port of `Hussainweb\DateConverter\Algorithm\Hijri\HijriFatimidAstronomical`
 * from `hussainweb/date-converter`.
 *
 * Uses epoch JDN 1948084 (integer), 11 kabisa (leap) years in each 30-year cycle
 * [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29], alternating 30/29 month lengths,
 * and astronomical year counting (year 0 exists, no artificial year <= 0 jump).
 */
export declare class FatimidAstronomicalCalendar implements CalendarEngine {
  readonly id = "fatimid-astronomical";
  /**
   * Astronomical epoch for the Fatimid Hijri calendar in integer Julian Day Number.
   * JDN 1948084 corresponds to 1 Muharram 1 AH being JDN 1948439.
   */
  static readonly EPOCH = 1948084;
  /**
   * Leap (kabisa) year indices within each 30-year cycle.
   */
  static readonly KABISA_YEARS: ReadonlySet<number>;
  /**
   * Number of months in any Fatimid Hijri year (always 12).
   */
  monthsInYear(_year: number): number;
  /**
   * Determines if the given year is a leap (kabisa) year.
   *
   * Uses non-negative modulo to correctly handle astronomical and negative years.
   */
  isKabisa(year: number): boolean;
  /**
   * Return number of days in the given month of the given year.
   *
   * Months 1..11 alternate 30 and 29 days (odd = 30, even = 29).
   * Month 12 has 30 days in a kabisa year and 29 days otherwise.
   */
  daysInMonth(year: number, month: number): number;
  /**
   * Convert a PlainDate to an integer Julian Day Number (JDN).
   */
  toJulianDay(date: PlainDate): number;
  /**
   * Convert an integer Julian Day Number (JDN) to a PlainDate.
   *
   * Exact arithmetic formula from PHP HijriAlgorithmBase::fromJulianDay.
   */
  fromJulianDay(jdn: number): PlainDate;
}
/**
 * Singleton instance of the FatimidAstronomicalCalendar engine.
 */
export declare const fatimidAstronomicalCalendar: FatimidAstronomicalCalendar;
//#endregion
//#region src/engine/labels.d.ts
/**
 * Transliterated month name labels for the Fatimid Astronomical calendar.
 */
interface MonthLabels {
  readonly long: readonly string[];
  readonly short: readonly string[];
}
/**
 * Transliterated full Fatimid month names (1-indexed, 12 months).
 */
export declare const FATIMID_MONTH_NAMES: readonly string[];
/**
 * Transliterated short Fatimid month names (1-indexed, 12 months).
 */
export declare const FATIMID_MONTH_NAMES_SHORT: readonly string[];
/**
 * Default transliterated month labels.
 */
export declare const DEFAULT_MONTH_LABELS: MonthLabels;
/**
 * Get the name of a month (1-indexed) from a labels dictionary.
 *
 * @param month Month index (1 to 12)
 * @param format 'long' or 'short' (default: 'long')
 * @param labels Optional custom labels dictionary
 * @returns The month name string, or empty string if month is out of range
 */
export declare function getMonthName(month: number, format?: "long" | "short", labels?: MonthLabels): string;
//#endregion
//#region src/format/types.d.ts
/**
 * Custom weekday labels dictionary.
 * Array of 7 weekday names starting with Sunday (0 = Sunday .. 6 = Saturday).
 */
interface WeekdayLabels {
  readonly long?: readonly string[] | undefined;
  readonly short?: readonly string[] | undefined;
  readonly narrow?: readonly string[] | undefined;
  /** Alias for narrow */
  readonly min?: readonly string[] | undefined;
}
/**
 * Options for localized calendar display formatting.
 */
interface DisplayOptions {
  /**
   * BCP 47 language tag (e.g. 'en', 'ar', 'fa', 'gu').
   * Used for Intl.DateTimeFormat (weekday names) and Intl.NumberFormat (localized digits).
   */
  readonly locale?: string | undefined;
  /**
   * Month display format: 'long' (e.g. 'Ramadan al-Moazzam') or 'short' (e.g. 'Ramadan').
   * Defaults to 'long'.
   */
  readonly month?: "long" | "short" | undefined;
  /**
   * Weekday display format: 'long' (e.g. 'Friday'), 'short' (e.g. 'Fri'), 'narrow' (e.g. 'F'), or 'min'.
   * If omitted or undefined, weekday is not included in the formatted string.
   */
  readonly weekday?: "long" | "short" | "narrow" | "min" | undefined;
  /**
   * Year display format: 'numeric' (e.g. '1445'), '2-digit' (e.g. '45'), or false to omit.
   * Defaults to 'numeric'.
   */
  readonly year?: "numeric" | "2-digit" | false | undefined;
  /**
   * Day of month display format: 'numeric' (e.g. '1'), '2-digit' (e.g. '01'), or false to omit.
   * Defaults to 'numeric'.
   */
  readonly day?: "numeric" | "2-digit" | false | undefined;
  /**
   * Custom labels dictionary (overrides default transliterated month names).
   */
  readonly labels?: MonthLabels | undefined;
  /**
   * Custom weekday names (overrides Intl weekday names).
   */
  readonly weekdays?: WeekdayLabels | readonly string[] | undefined;
  /**
   * Ordering of date components: 'dmy', 'mdy', or 'ymd'.
   * Defaults to 'dmy' for English/fallback, or inferred from locale.
   */
  readonly order?: "dmy" | "mdy" | "ymd" | undefined;
  /**
   * Custom separator between weekday and date part (e.g. ", " or "، ").
   * If omitted, automatically uses Arabic comma ("، ") for Arabic-script locales (ar, fa, ur)
   * and standard comma (", ") otherwise.
   */
  readonly separator?: string | undefined;
}
//#endregion
//#region src/ui/types.d.ts
/**
 * Localisable labels for the datepicker dialog shell and controls.
 */
interface PickerLabels {
  readonly chooseDate?: string | undefined;
  readonly trigger?: string | undefined;
  readonly open?: string | undefined;
  readonly previousMonth?: string | undefined;
  readonly prev?: string | undefined;
  readonly nextMonth?: string | undefined;
  readonly next?: string | undefined;
  readonly monthSelect?: string | undefined;
  readonly yearSelect?: string | undefined;
  readonly today?: string | undefined;
  readonly clear?: string | undefined;
  readonly close?: string | undefined;
  readonly dialogTitle?: string | undefined;
  readonly months?: MonthLabels | undefined;
  readonly weekdays?: WeekdayLabels | readonly string[] | undefined;
  readonly invalidDate?: string | undefined;
  readonly outOfRange?: string | undefined;
  readonly liveRegion?: ((monthName: string, year: string) => string) | string | undefined;
}
/**
 * Concrete resolved labels guaranteed to be non-undefined strings.
 */
interface ResolvedPickerLabels {
  readonly chooseDate: string;
  readonly previousMonth: string;
  readonly prev: string;
  readonly nextMonth: string;
  readonly next: string;
  readonly monthSelect: string;
  readonly yearSelect: string;
  readonly today: string;
  readonly clear: string;
  readonly close: string;
  readonly dialogTitle: string;
  readonly months: MonthLabels;
  readonly weekdays?: WeekdayLabels | readonly string[] | undefined;
  readonly invalidDate: string;
  readonly outOfRange: string;
  readonly liveRegion?: ((monthName: string, year: string) => string) | string | undefined;
}
/**
 * References to the DOM elements created for the calendar dialog shell.
 */
interface DialogElements {
  readonly trigger: HTMLButtonElement;
  readonly dialog: HTMLDialogElement;
  readonly title: HTMLElement;
  readonly header: HTMLElement;
  readonly btnPrev: HTMLButtonElement;
  readonly btnNext: HTMLButtonElement;
  readonly selectMonth: HTMLSelectElement;
  readonly selectYear: HTMLSelectElement;
  readonly liveRegion: HTMLDivElement;
  readonly gridContainer: HTMLDivElement;
  readonly footer: HTMLElement;
  readonly btnToday: HTMLButtonElement;
  readonly btnClear: HTMLButtonElement;
  readonly btnClose?: HTMLButtonElement | undefined;
  readonly grid?: HTMLTableElement | undefined;
}
//#endregion
//#region src/format/value.d.ts
/**
 * Format a PlainDate into a machine-readable value string.
 *
 * Supported format tokens:
 * - `YYYY`: 4-digit zero-padded year (ASCII digits)
 * - `MM`: 2-digit zero-padded month (01-12)
 * - `M`: Month number without zero-padding (1-12)
 * - `DD`: 2-digit zero-padded day of month (01-30)
 * - `D`: Day number without zero-padding (1-30)
 * - `MMMM`: Full transliterated month name
 * - `MMM`: Short transliterated month name
 *
 * Default pattern: "YYYY-MM-DD"
 * All numerical digits are strictly ASCII characters (0-9).
 */
export declare function formatValue(date: PlainDate, pattern?: string, labels?: MonthLabels): string;
/**
 * Strict parser for machine date strings.
 *
 * Parses a string formatted according to the given pattern and validates
 * that year, month, and day are valid civil calendar units.
 *
 * If an engine is provided, day bounds are strictly validated against
 * engine.daysInMonth(year, month) and month against engine.monthsInYear(year).
 *
 * Returns `PlainDate` if valid, or `null` if the input is malformed, has out-of-bounds
 * units, or contains non-ASCII digits.
 */
export declare function parseValue(str: string, pattern?: string, engine?: CalendarEngine, labels?: MonthLabels): PlainDate | null;
//#endregion
//#region src/format/display.d.ts
/**
 * Reset all cached Intl formatters (useful for tests).
 */
export declare function clearFormatterCache(): void;
/**
 * Return a cached Intl.DateTimeFormat instance.
 */
export declare function getDateTimeFormatter(locale?: string, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat;
/**
 * Return a cached Intl.NumberFormat instance.
 */
export declare function getNumberFormatter(locale?: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat;
/**
 * Format a calendar year number using localized numerals for the given locale.
 */
export declare function formatYear(year: number, locale?: string): string;
/**
 * Detect whether a locale uses Arabic comma ("، ", U+060C) as a separator.
 * Accurately covers Arabic (ar), Persian (fa), Urdu (ur), Pashto (ps), Uyghur (ug),
 * Sindhi (sd), Kurdish (ckb), and other Arabic-script languages without false-matching 'arn' (Mapudungun).
 */
export declare function isArabicScriptLocale(locale?: string): boolean;
/**
 * Infer the component order ('dmy', 'mdy', or 'ymd') for a given locale.
 * Defaults to 'dmy' for English/fallback (matching standard Hijri date conventions in English).
 */
export declare function inferDateOrder(locale?: string): "dmy" | "mdy" | "ymd";
/**
 * Return localized weekday names for the civil week using Intl.DateTimeFormat or custom labels.
 *
 * @param locale BCP 47 locale tag (default: system / undefined)
 * @param format 'long', 'short', 'narrow', or 'min' (alias for narrow)
 * @param firstDay First day of week index: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (default: 0)
 * @param customWeekdays Optional custom weekday names array or dictionary
 * @returns Array of 7 localized weekday names
 */
export declare function getWeekdayNames(locale?: string, format?: "long" | "short" | "narrow" | "min", firstDay?: number, customWeekdays?: WeekdayLabels | readonly string[]): string[];
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
export declare function formatDisplay(date: PlainDate, engine: CalendarEngine, options?: DisplayOptions): string;
/**
 * Format a full accessible ARIA label for a calendar grid day cell.
 * E.g. "Friday, 1 Ramadan al-Moazzam 1445"
 */
export declare function formatDayAriaLabel(date: PlainDate, engine: CalendarEngine, locale?: string | undefined, labels?: MonthLabels | undefined, weekdays?: WeekdayLabels | readonly string[] | undefined, order?: "dmy" | "mdy" | "ymd" | undefined): string;
/**
 * Format a heading label for month navigation views.
 * E.g. "Ramadan al-Moazzam 1445"
 */
export declare function formatMonthHeading(date: PlainDate, engine: CalendarEngine, options?: {
  readonly month?: "long" | "short" | undefined;
  readonly locale?: string | undefined;
  readonly labels?: MonthLabels | undefined;
  readonly order?: "dmy" | "mdy" | "ymd" | undefined;
}): string;
//#endregion
//#region src/ui/dom.d.ts
/**
 * Default resolved labels for the datepicker UI.
 */
export declare const DEFAULT_LABELS: ResolvedPickerLabels;
//#endregion
//#region src/index.d.ts
/**
 * Options for configuring TaarikhPicker.
 */
export interface TaarikhPickerOptions {
  readonly engine?: CalendarEngine | undefined;
  readonly labels?: PickerLabels | undefined;
  readonly firstDayOfWeek?: number | undefined;
  readonly minDate?: PlainDate | undefined;
  readonly maxDate?: PlainDate | undefined;
  readonly valueFormat?: string | undefined;
  /** Alias for valueFormat */
  readonly valuePattern?: string | undefined;
  readonly dir?: "ltr" | "rtl" | "auto" | undefined;
  readonly isRtl?: boolean | undefined;
  readonly locale?: string | undefined;
  readonly initialDate?: PlainDate | undefined;
  readonly selectedDate?: PlainDate | undefined;
  readonly idPrefix?: string | undefined;
  readonly onMonthChange?: ((date: PlainDate) => void) | undefined;
  readonly onToday?: ((todayDate: PlainDate) => void) | undefined;
  readonly onClear?: (() => void) | undefined;
  readonly onOpen?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly onSelect?: ((date: PlainDate) => void) | undefined;
}
/**
 * Determine the default first day of the week (0 = Sunday .. 6 = Saturday)
 * using Intl.Locale getWeekInfo when supported, falling back to 0 (Sunday).
 */
export declare function getDefaultFirstDayOfWeek(locale?: string): number;
/**
 * Resolve whether the picker should operate in RTL layout mode.
 */
export declare function resolveIsRtl(input: HTMLElement, dir?: "ltr" | "rtl" | "auto", isRtl?: boolean): boolean;
/**
 * Accessible datepicker for Hijri calendars.
 */
export declare class TaarikhPicker {
  private readonly input;
  private readonly options;
  private dialogShell;
  constructor(input: HTMLInputElement, options?: TaarikhPickerOptions);
  open(): void;
  close(): void;
  isOpen(): boolean;
  getDate(): PlainDate | null;
  setDate(date: PlainDate | null | undefined): void;
  getInput(): HTMLInputElement;
  getElements(): DialogElements | undefined;
  getVisibleDate(): PlainDate | undefined;
  setVisibleDate(date: PlainDate): void;
  destroy(): void;
  [Symbol.dispose](): void;
}
/**
 * Public factory function to initialize a TaarikhPicker on an input element.
 */
export declare function createPicker(input: HTMLInputElement, options?: TaarikhPickerOptions): TaarikhPicker;
//#endregion
export type { CalendarEngine, DialogElements, DisplayOptions, MonthLabels, PickerLabels, PlainDate, ResolvedPickerLabels, WeekdayLabels };
//# sourceMappingURL=index.d.ts.map