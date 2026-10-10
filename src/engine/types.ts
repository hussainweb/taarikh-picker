/**
 * A calendar-independent representation of a civil date.
 *
 * Year, month, and day are pure integers without time, timezone, or locale.
 * Months and days are 1-indexed. Years are astronomical (year 0 exists).
 */
export interface PlainDate {
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
export interface CalendarEngine {
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
