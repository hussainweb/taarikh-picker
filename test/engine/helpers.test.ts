import { describe, expect, it } from 'vitest';
import type { CalendarEngine, PlainDate } from '../../src/engine/types.js';
import {
  addDays,
  addMonths,
  addYears,
  compareDates,
  gregorianToJulianDay,
  isAfter,
  isBefore,
  isSameDay,
  today,
  weekday,
  weekdayFromJdn,
} from '../../src/engine/helpers.js';

/**
 * Minimal mock engine based on standard 12-month calendar
 * with alternating 30/29 day months (like Fatimid astronomical).
 * Epoch: JDN 1948084 (1 Muharram 1 AH).
 */
function createMockHijriEngine(): CalendarEngine {
  const isLeapYear = (y: number): boolean => {
    const leapYears = [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29];
    const mod = ((y % 30) + 30) % 30;
    return leapYears.includes(mod);
  };

  return {
    id: 'mock-hijri',
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
        day +
        Math.ceil(29.5 * (month - 1)) +
        354 * year +
        Math.floor((11 * year) / 30) +
        1948084
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

/**
 * Mock engine where monthsInYear varies (e.g. leap year has 13 months).
 */
function createVariableMonthEngine(): CalendarEngine {
  return {
    id: 'mock-variable-months',
    monthsInYear(year: number): number {
      return year === 2 ? 13 : 12;
    },
    daysInMonth(_year: number, _month: number): number {
      return 30;
    },
    toJulianDay(date: PlainDate): number {
      return date.year * 400 + date.month * 30 + date.day;
    },
    fromJulianDay(jdn: number): PlainDate {
      const year = Math.floor(jdn / 400);
      const rem = jdn % 400;
      const month = Math.floor(rem / 30);
      const day = rem % 30;
      return { year, month, day };
    },
  };
}

describe('weekdayFromJdn and weekday', () => {
  it('maps JDN 0 to Monday (1)', () => {
    expect(weekdayFromJdn(0)).toBe(1);
    expect(weekday(0)).toBe(1);
  });

  it('correctly maps the full 7-day civil week sequence (Sunday=0 to Saturday=6)', () => {
    expect(weekdayFromJdn(6)).toBe(0); // Sunday
    expect(weekdayFromJdn(0)).toBe(1); // Monday
    expect(weekdayFromJdn(1)).toBe(2); // Tuesday
    expect(weekdayFromJdn(2)).toBe(3); // Wednesday
    expect(weekdayFromJdn(3)).toBe(4); // Thursday
    expect(weekdayFromJdn(4)).toBe(5); // Friday
    expect(weekdayFromJdn(5)).toBe(6); // Saturday
    expect(weekdayFromJdn(7)).toBe(1); // Monday
  });

  it('correctly calculates known reference civil dates', () => {
    // 2026-10-10 is a Saturday (JDN 2461324)
    expect(weekdayFromJdn(2461324)).toBe(6);
    // 2026-10-11 is a Sunday (JDN 2461325)
    expect(weekdayFromJdn(2461325)).toBe(0);
  });

  it('handles negative JDNs without returning negative results', () => {
    expect(weekdayFromJdn(-1)).toBe(0); // Sunday
    expect(weekdayFromJdn(-2)).toBe(6); // Saturday
    expect(weekdayFromJdn(-7)).toBe(1); // Monday
    expect(weekdayFromJdn(-8)).toBe(0); // Sunday
  });

  it('floors fractional JDN inputs', () => {
    expect(weekdayFromJdn(2461324.5)).toBe(6);
    expect(weekday(2461324.9)).toBe(6);
  });

  it('delegates to engine.toJulianDay when passed a PlainDate', () => {
    const engine = createMockHijriEngine();
    // 1445-12-01 in mock engine
    const date: PlainDate = { year: 1445, month: 12, day: 1 };
    const expectedJdn = engine.toJulianDay(date);
    expect(weekday(date, engine)).toBe(weekdayFromJdn(expectedJdn));
  });

  it('throws TypeError if engine is omitted when passing a PlainDate', () => {
    const date: PlainDate = { year: 1445, month: 12, day: 1 };
    // @ts-expect-error Testing invalid runtime call
    expect(() => weekday(date)).toThrow(TypeError);
  });
});

describe('gregorianToJulianDay', () => {
  it('converts known reference civil dates matching PHP gregoriantojd', () => {
    expect(gregorianToJulianDay(1970, 1, 1)).toBe(2440588);
    expect(gregorianToJulianDay(2000, 1, 1)).toBe(2451545);
    expect(gregorianToJulianDay(2026, 10, 10)).toBe(2461324);
    expect(gregorianToJulianDay(2024, 2, 29)).toBe(2460370); // Leap day
    expect(gregorianToJulianDay(1900, 2, 28)).toBe(2415079); // Non-leap century
    expect(gregorianToJulianDay(1900, 3, 1)).toBe(2415080);
    expect(gregorianToJulianDay(1582, 10, 15)).toBe(2299161); // Gregorian calendar epoch
  });
});

describe('addDays', () => {
  const engine = createMockHijriEngine();

  it('adds positive days', () => {
    const start: PlainDate = { year: 1445, month: 1, day: 10 };
    const result = addDays(start, 5, engine);
    expect(result).toEqual({ year: 1445, month: 1, day: 15 });
  });

  it('adds days across month boundaries', () => {
    const start: PlainDate = { year: 1445, month: 1, day: 28 };
    // Month 1 has 30 days
    const result = addDays(start, 5, engine);
    expect(result).toEqual({ year: 1445, month: 2, day: 3 });
  });

  it('subtracts days across month and year boundaries', () => {
    const start: PlainDate = { year: 1445, month: 1, day: 2 };
    const result = addDays(start, -5, engine);
    // Year 1444 month 12 has 29 or 30 days
    expect(result.year).toBe(1444);
    expect(result.month).toBe(12);
  });

  it('adding 0 days returns equivalent date', () => {
    const start: PlainDate = { year: 1445, month: 5, day: 15 };
    expect(addDays(start, 0, engine)).toEqual(start);
  });

  it('truncates non-integer day increments', () => {
    const start: PlainDate = { year: 1445, month: 1, day: 10 };
    expect(addDays(start, 3.8, engine)).toEqual({ year: 1445, month: 1, day: 13 });
  });
});

describe('addMonths', () => {
  const engine = createMockHijriEngine();

  it('adds months within the same year', () => {
    const start: PlainDate = { year: 1445, month: 2, day: 10 };
    expect(addMonths(start, 3, engine)).toEqual({ year: 1445, month: 5, day: 10 });
  });

  it('adds months crossing year boundaries', () => {
    const start: PlainDate = { year: 1445, month: 10, day: 15 };
    expect(addMonths(start, 4, engine)).toEqual({ year: 1446, month: 2, day: 15 });
    expect(addMonths(start, 14, engine)).toEqual({ year: 1446, month: 12, day: 15 });
  });

  it('subtracts months within the same year', () => {
    const start: PlainDate = { year: 1445, month: 5, day: 10 };
    expect(addMonths(start, -3, engine)).toEqual({ year: 1445, month: 2, day: 10 });
  });

  it('subtracts months crossing year boundaries', () => {
    const start: PlainDate = { year: 1445, month: 2, day: 15 };
    expect(addMonths(start, -3, engine)).toEqual({ year: 1444, month: 11, day: 15 });
  });

  it('adding 0 months returns the same date', () => {
    const start: PlainDate = { year: 1445, month: 6, day: 20 };
    expect(addMonths(start, 0, engine)).toEqual(start);
  });

  it('clamps day when target month has fewer days', () => {
    // Month 1 has 30 days; month 2 has 29 days
    const start: PlainDate = { year: 1445, month: 1, day: 30 };
    const nextMonth = addMonths(start, 1, engine);
    expect(nextMonth).toEqual({ year: 1445, month: 2, day: 29 });
  });

  it('handles variable-month calendar engines (e.g. leap month 13)', () => {
    const varEngine = createVariableMonthEngine();
    // Year 1 has 12 months, year 2 has 13 months
    const start: PlainDate = { year: 1, month: 11, day: 15 };
    // +2 months: 1/11 -> 1/12 (1) -> 2/1 (2)
    expect(addMonths(start, 2, varEngine)).toEqual({ year: 2, month: 1, day: 15 });
    // +13 months from 1/11: 2 months to 2/1 + 11 months -> reaches month 12 in year 2
    expect(addMonths(start, 13, varEngine)).toEqual({ year: 2, month: 12, day: 15 });
    // +14 months from 1/11: reaches month 13 in year 2 (leap month)
    expect(addMonths(start, 14, varEngine)).toEqual({ year: 2, month: 13, day: 15 });
    // +15 months from 1/11: reaches year 3 month 1
    expect(addMonths(start, 15, varEngine)).toEqual({ year: 3, month: 1, day: 15 });
  });
});

describe('addYears', () => {
  const engine = createMockHijriEngine();

  it('adds positive years', () => {
    const start: PlainDate = { year: 1445, month: 5, day: 15 };
    expect(addYears(start, 2, engine)).toEqual({ year: 1447, month: 5, day: 15 });
  });

  it('subtracts years', () => {
    const start: PlainDate = { year: 1445, month: 5, day: 15 };
    expect(addYears(start, -3, engine)).toEqual({ year: 1442, month: 5, day: 15 });
  });

  it('adding 0 years returns same date', () => {
    const start: PlainDate = { year: 1445, month: 5, day: 15 };
    expect(addYears(start, 0, engine)).toEqual(start);
  });

  it('clamps day if target year has fewer days in the same month (e.g. leap to non-leap)', () => {
    // In mock hijri: year 2 is leap (month 12 has 30 days), year 3 is not leap (month 12 has 29 days)
    const leapDate: PlainDate = { year: 2, month: 12, day: 30 };
    expect(addYears(leapDate, 1, engine)).toEqual({ year: 3, month: 12, day: 29 });
  });

  it('clamps month if target year has fewer months', () => {
    const varEngine = createVariableMonthEngine();
    // Year 2 has 13 months; year 3 has 12 months
    const leapMonthDate: PlainDate = { year: 2, month: 13, day: 15 };
    expect(addYears(leapMonthDate, 1, varEngine)).toEqual({ year: 3, month: 12, day: 15 });
  });
});

describe('compareDates, isSameDay, isBefore, isAfter', () => {
  const d1: PlainDate = { year: 1445, month: 5, day: 10 };
  const d2: PlainDate = { year: 1445, month: 5, day: 10 };
  const d3: PlainDate = { year: 1445, month: 5, day: 11 };
  const d4: PlainDate = { year: 1445, month: 6, day: 1 };
  const d5: PlainDate = { year: 1446, month: 1, day: 1 };

  it('compareDates returns 0 for equal dates', () => {
    expect(compareDates(d1, d2)).toBe(0);
  });

  it('compareDates returns -1 when first is earlier', () => {
    expect(compareDates(d1, d3)).toBe(-1); // different day
    expect(compareDates(d1, d4)).toBe(-1); // different month
    expect(compareDates(d1, d5)).toBe(-1); // different year
  });

  it('compareDates returns 1 when first is later', () => {
    expect(compareDates(d3, d1)).toBe(1); // different day
    expect(compareDates(d4, d1)).toBe(1); // different month
    expect(compareDates(d5, d1)).toBe(1); // different year
  });

  it('isSameDay correctly identifies same day', () => {
    expect(isSameDay(d1, d2)).toBe(true);
    expect(isSameDay(d1, d3)).toBe(false);
  });

  it('isBefore correctly identifies earlier dates', () => {
    expect(isBefore(d1, d3)).toBe(true);
    expect(isBefore(d3, d1)).toBe(false);
    expect(isBefore(d1, d2)).toBe(false);
  });

  it('isAfter correctly identifies later dates', () => {
    expect(isAfter(d3, d1)).toBe(true);
    expect(isAfter(d1, d3)).toBe(false);
    expect(isAfter(d1, d2)).toBe(false);
  });
});

describe('today', () => {
  it('converts given Date to JDN and then converts via engine.fromJulianDay', () => {
    const engine = createMockHijriEngine();
    // 2026-10-10 Gregorian civil date
    const date = new Date(2026, 9, 10); // month is 0-indexed in JS Date
    const result = today(engine, date);
    const expectedJdn = gregorianToJulianDay(2026, 10, 10);
    expect(result).toEqual(engine.fromJulianDay(expectedJdn));
  });

  it('calling today(engine) without date returns a valid PlainDate', () => {
    const engine = createMockHijriEngine();
    const result = today(engine);
    expect(typeof result.year).toBe('number');
    expect(typeof result.month).toBe('number');
    expect(typeof result.day).toBe('number');
    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
    expect(result.day).toBeGreaterThanOrEqual(1);
    expect(result.day).toBeLessThanOrEqual(30);
  });
});
