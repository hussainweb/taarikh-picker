import type { MonthLabels } from "../engine/index.js";

/**
 * Custom weekday labels dictionary.
 * Array of 7 weekday names starting with Sunday (0 = Sunday .. 6 = Saturday).
 */
export interface WeekdayLabels {
  readonly long?: readonly string[] | undefined;
  readonly short?: readonly string[] | undefined;
  readonly narrow?: readonly string[] | undefined;
  /** Alias for narrow */
  readonly min?: readonly string[] | undefined;
}

/**
 * Options for localized calendar display formatting.
 */
export interface DisplayOptions {
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
