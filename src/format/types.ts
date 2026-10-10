import type { MonthLabels } from "../engine/index.js";

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
   * Weekday display format: 'long' (e.g. 'Friday'), 'short' (e.g. 'Fri'), or 'narrow' (e.g. 'F').
   * If omitted or undefined, weekday is not included in the formatted string.
   */
  readonly weekday?: "long" | "short" | "narrow" | undefined;

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
}
