import type { CalendarEngine, PlainDate } from "./types.js";

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
export class FatimidAstronomicalCalendar implements CalendarEngine {
  public readonly id = "fatimid-astronomical";

  /**
   * Astronomical epoch for the Fatimid Hijri calendar in integer Julian Day Number.
   * JDN 1948084 corresponds to 1 Muharram 1 AH being JDN 1948439.
   */
  public static readonly EPOCH = 1948084;

  /**
   * Leap (kabisa) year indices within each 30-year cycle.
   */
  public static readonly KABISA_YEARS: ReadonlySet<number> = new Set([
    2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29,
  ]);

  /**
   * Number of months in any Fatimid Hijri year (always 12).
   */
  public monthsInYear(_year: number): number {
    return 12;
  }

  /**
   * Determines if the given year is a leap (kabisa) year.
   *
   * Uses non-negative modulo to correctly handle astronomical and negative years.
   */
  public isKabisa(year: number): boolean {
    const cycle = ((Math.trunc(year) % 30) + 30) % 30;
    return FatimidAstronomicalCalendar.KABISA_YEARS.has(cycle);
  }

  /**
   * Return number of days in the given month of the given year.
   *
   * Months 1..11 alternate 30 and 29 days (odd = 30, even = 29).
   * Month 12 has 30 days in a kabisa year and 29 days otherwise.
   */
  public daysInMonth(year: number, month: number): number {
    if (month < 1 || month > 12) {
      return 0;
    }
    if (month === 12) {
      return this.isKabisa(year) ? 30 : 29;
    }
    return month % 2 === 0 ? 29 : 30;
  }

  /**
   * Convert a PlainDate to an integer Julian Day Number (JDN).
   */
  public toJulianDay(date: PlainDate): number {
    return Math.floor(
      date.day +
        Math.ceil(29.5 * (date.month - 1)) +
        354 * date.year +
        Math.floor((11 * date.year) / 30) +
        FatimidAstronomicalCalendar.EPOCH,
    );
  }

  /**
   * Convert an integer Julian Day Number (JDN) to a PlainDate.
   *
   * Exact arithmetic formula from PHP HijriAlgorithmBase::fromJulianDay.
   */
  public fromJulianDay(jdn: number): PlainDate {
    const jd = Math.floor(jdn);
    const daysPerYear = 10631 / 30;
    const shift = 0.01 / 30;
    let z = jd - FatimidAstronomicalCalendar.EPOCH;
    const cyc = Math.floor(z / 10631);
    z -= 10631 * cyc;
    const j = Math.floor((z - shift) / daysPerYear);
    const year = 30 * cyc + j;
    z -= Math.floor(j * daysPerYear + shift);
    let month = Math.floor((z + 28.5001) / 29.5);
    if (month === 13) month = 12;
    const day = z - Math.floor(29.5001 * month - 29);
    return { year, month, day };
  }
}

/**
 * Singleton instance of the FatimidAstronomicalCalendar engine.
 */
export const fatimidAstronomicalCalendar: FatimidAstronomicalCalendar =
  new FatimidAstronomicalCalendar();

/**
 * Convenient shorthand alias for fatimidAstronomicalCalendar.
 */
export const fatimidAstronomical: FatimidAstronomicalCalendar = fatimidAstronomicalCalendar;
