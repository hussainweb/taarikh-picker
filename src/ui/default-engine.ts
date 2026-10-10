import type { CalendarEngine, PlainDate } from "../engine/types.js";

/**
 * Standard 12-month Hijri astronomical / tabular calendar engine.
 * Epoch: JDN 1948084 (1 Muharram 1 AH).
 * Leap years in 30-year cycle: [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29].
 * Used as a zero-dependency default when no custom CalendarEngine is passed.
 */
export function createDefaultCalendarEngine(): CalendarEngine {
  const isLeapYear = (y: number): boolean => {
    const leapYears = [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29];
    const mod = ((y % 30) + 30) % 30;
    return leapYears.includes(mod);
  };

  return {
    id: "fatimid-astronomical-default",
    monthsInYear(_year: number): number {
      return 12;
    },
    daysInMonth(year: number, month: number): number {
      if (month === 12) {
        return isLeapYear(year) ? 30 : 29;
      }
      return month % 2 === 1 ? 30 : 29;
    },
    toJulianDay(date: PlainDate): number {
      const { year, month, day } = date;
      return (
        day + Math.ceil(29.5 * (month - 1)) + 354 * year + Math.floor((11 * year) / 30) + 1948084
      );
    },
    fromJulianDay(julianDay: number): PlainDate {
      const jd = Math.floor(julianDay);
      const daysPerYear = 10631 / 30;
      const shift = 0.01 / 30;
      let z = jd - 1948084;
      const cyc = Math.floor(z / 10631);
      z -= 10631 * cyc;
      const j = Math.floor((z - shift) / daysPerYear);
      const year = 30 * cyc + j;
      z -= Math.floor(j * daysPerYear + shift);
      let month = Math.floor((z + 28.5001) / 29.5);
      if (month === 13) {
        month = 12;
      }
      const day = z - Math.floor(29.5001 * month - 29);
      return { year, month, day };
    },
  };
}
