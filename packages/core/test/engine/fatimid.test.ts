import { describe, expect, it } from "vitest";
import {
  DEFAULT_MONTH_LABELS,
  FATIMID_MONTH_NAMES,
  FATIMID_MONTH_NAMES_SHORT,
  FatimidAstronomicalCalendar,
  addDays,
  fatimidAstronomical,
  fatimidAstronomicalCalendar,
  getMonthName,
  weekday,
  weekdayFromJdn,
} from "../../src/engine/index.js";

describe("FatimidAstronomicalCalendar", () => {
  it("can be instantiated and exposes static constants", () => {
    const engine = new FatimidAstronomicalCalendar();
    expect(engine.id).toBe("fatimid-astronomical");
    expect(FatimidAstronomicalCalendar.EPOCH).toBe(1948084);
  });

  it("has id 'fatimid-astronomical'", () => {
    expect(fatimidAstronomicalCalendar.id).toBe("fatimid-astronomical");
    expect(fatimidAstronomical.id).toBe("fatimid-astronomical");
  });

  it("always returns 12 months in a year", () => {
    expect(fatimidAstronomicalCalendar.monthsInYear(1)).toBe(12);
    expect(fatimidAstronomicalCalendar.monthsInYear(1445)).toBe(12);
    expect(fatimidAstronomicalCalendar.monthsInYear(0)).toBe(12);
    expect(fatimidAstronomicalCalendar.monthsInYear(-10)).toBe(12);
  });

  describe("kabisa (leap year) calculation", () => {
    const KABISA_CYCLE = [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29];

    it("correctly identifies the 11 kabisa years in a 30-year cycle", () => {
      for (let y = 1; y <= 30; y++) {
        const expected = KABISA_CYCLE.includes(y % 30);
        expect(fatimidAstronomicalCalendar.isKabisa(y)).toBe(expected);
      }
    });

    it("repeats accurately across multiple 30-year cycles", () => {
      for (let cycle = 0; cycle < 5; cycle++) {
        for (const k of KABISA_CYCLE) {
          expect(fatimidAstronomicalCalendar.isKabisa(cycle * 30 + k)).toBe(true);
        }
      }
    });

    it("handles negative and astronomical years using non-negative modulo", () => {
      // Year 0 % 30 = 0 -> non-kabisa
      expect(fatimidAstronomicalCalendar.isKabisa(0)).toBe(false);
      // Year -1: ((-1 % 30) + 30) % 30 = 29 -> kabisa
      expect(fatimidAstronomicalCalendar.isKabisa(-1)).toBe(true);
      // Year -28: ((-28 % 30) + 30) % 30 = 2 -> kabisa
      expect(fatimidAstronomicalCalendar.isKabisa(-28)).toBe(true);
      // Year -25: ((-25 % 30) + 30) % 30 = 5 -> kabisa
      expect(fatimidAstronomicalCalendar.isKabisa(-25)).toBe(true);
      // Year -30: ((-30 % 30) + 30) % 30 = 0 -> non-kabisa
      expect(fatimidAstronomicalCalendar.isKabisa(-30)).toBe(false);
    });
  });

  describe("daysInMonth", () => {
    it("alternates 30 and 29 days for months 1 through 11", () => {
      const expectedDays = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30];
      for (let m = 1; m <= 11; m++) {
        expect(fatimidAstronomicalCalendar.daysInMonth(1, m)).toBe(expectedDays[m - 1]);
        expect(fatimidAstronomicalCalendar.daysInMonth(2, m)).toBe(expectedDays[m - 1]);
      }
    });

    it("returns 29 days for month 12 in a non-kabisa year", () => {
      expect(fatimidAstronomicalCalendar.daysInMonth(1, 12)).toBe(29);
      expect(fatimidAstronomicalCalendar.daysInMonth(3, 12)).toBe(29);
      expect(fatimidAstronomicalCalendar.daysInMonth(1444, 12)).toBe(29);
      expect(fatimidAstronomicalCalendar.daysInMonth(1446, 12)).toBe(29);
    });

    it("returns 30 days for month 12 in a kabisa year", () => {
      expect(fatimidAstronomicalCalendar.daysInMonth(2, 12)).toBe(30);
      expect(fatimidAstronomicalCalendar.daysInMonth(5, 12)).toBe(30);
      expect(fatimidAstronomicalCalendar.daysInMonth(8, 12)).toBe(30);
      expect(fatimidAstronomicalCalendar.daysInMonth(10, 12)).toBe(30);
      expect(fatimidAstronomicalCalendar.daysInMonth(1445, 12)).toBe(30);
    });

    it("results in 354 total days in non-kabisa year and 355 in kabisa year", () => {
      let nonKabisaSum = 0;
      for (let m = 1; m <= 12; m++) {
        nonKabisaSum += fatimidAstronomicalCalendar.daysInMonth(1, m);
      }
      expect(nonKabisaSum).toBe(354);

      let kabisaSum = 0;
      for (let m = 1; m <= 12; m++) {
        kabisaSum += fatimidAstronomicalCalendar.daysInMonth(2, m);
      }
      expect(kabisaSum).toBe(355);
    });

    it("returns 0 for out-of-range months", () => {
      expect(fatimidAstronomicalCalendar.daysInMonth(1, 0)).toBe(0);
      expect(fatimidAstronomicalCalendar.daysInMonth(1, 13)).toBe(0);
      expect(fatimidAstronomicalCalendar.daysInMonth(1, -1)).toBe(0);
    });
  });

  describe("Julian Day conversions", () => {
    it("anchors 1 Muharram 1 AH to JDN 1948439", () => {
      const anchorDate = { year: 1, month: 1, day: 1 };
      const jdn = fatimidAstronomicalCalendar.toJulianDay(anchorDate);
      expect(jdn).toBe(1948439);

      const parsed = fatimidAstronomicalCalendar.fromJulianDay(1948439);
      expect(parsed).toEqual(anchorDate);
    });

    it("anchors 1 Muharram 1 AH weekday to Thursday (4)", () => {
      expect(weekdayFromJdn(1948439)).toBe(4);
      expect(weekday({ year: 1, month: 1, day: 1 }, fatimidAstronomicalCalendar)).toBe(4);
    });

    it("round-trips all days in non-kabisa year 1", () => {
      for (let month = 1; month <= 12; month++) {
        const days = fatimidAstronomicalCalendar.daysInMonth(1, month);
        for (let day = 1; day <= days; day++) {
          const date = { year: 1, month, day };
          const jdn = fatimidAstronomicalCalendar.toJulianDay(date);
          const roundTrip = fatimidAstronomicalCalendar.fromJulianDay(jdn);
          expect(roundTrip).toEqual(date);
        }
      }
    });

    it("round-trips all days in kabisa year 2 (including Zilhaj 30)", () => {
      for (let month = 1; month <= 12; month++) {
        const days = fatimidAstronomicalCalendar.daysInMonth(2, month);
        for (let day = 1; day <= days; day++) {
          const date = { year: 2, month, day };
          const jdn = fatimidAstronomicalCalendar.toJulianDay(date);
          const roundTrip = fatimidAstronomicalCalendar.fromJulianDay(jdn);
          expect(roundTrip).toEqual(date);
        }
      }
    });

    it("correctly round-trips contemporary dates", () => {
      const contemporaryDates = [
        { year: 1445, month: 9, day: 1 }, // 1 Ramadan 1445
        { year: 1445, month: 9, day: 30 }, // 30 Ramadan 1445
        { year: 1445, month: 10, day: 1 }, // 1 Shawwal 1445
        { year: 1446, month: 1, day: 1 }, // 1 Muharram 1446
        { year: 1446, month: 12, day: 29 },
      ];

      for (const date of contemporaryDates) {
        const jdn = fatimidAstronomicalCalendar.toJulianDay(date);
        expect(fatimidAstronomicalCalendar.fromJulianDay(jdn)).toEqual(date);
      }
    });

    it("correctly round-trips astronomical year 0 and negative years without errors", () => {
      const historicalDates = [
        { year: 0, month: 1, day: 1 },
        { year: 0, month: 12, day: 29 },
        { year: -1, month: 1, day: 1 },
        { year: -1, month: 12, day: 30 }, // year -1 is kabisa
        { year: -100, month: 6, day: 15 },
        { year: -1445, month: 9, day: 1 },
      ];

      for (const date of historicalDates) {
        const jdn = fatimidAstronomicalCalendar.toJulianDay(date);
        expect(fatimidAstronomicalCalendar.fromJulianDay(jdn)).toEqual(date);
      }
    });

    it("preserves contiguity: consecutive days have consecutive JDNs", () => {
      let currentDate = { year: 1445, month: 1, day: 1 };
      let previousJdn = fatimidAstronomicalCalendar.toJulianDay(currentDate);

      for (let i = 1; i <= 354; i++) {
        currentDate = addDays(currentDate, 1, fatimidAstronomicalCalendar);
        const currentJdn = fatimidAstronomicalCalendar.toJulianDay(currentDate);
        expect(currentJdn).toBe(previousJdn + 1);
        previousJdn = currentJdn;
      }
    });

    it("round-trips consecutive integer JDNs over a 1000-day window", () => {
      const startJdn = 1948439;
      for (let jdn = startJdn; jdn < startJdn + 1000; jdn++) {
        const date = fatimidAstronomicalCalendar.fromJulianDay(jdn);
        const backToJdn = fatimidAstronomicalCalendar.toJulianDay(date);
        expect(backToJdn).toBe(jdn);
      }
    });
  });

  describe("Month labels", () => {
    it("contains 12 full and 12 short transliterated month names", () => {
      expect(FATIMID_MONTH_NAMES).toHaveLength(12);
      expect(FATIMID_MONTH_NAMES_SHORT).toHaveLength(12);
      expect(DEFAULT_MONTH_LABELS.long).toHaveLength(12);
      expect(DEFAULT_MONTH_LABELS.short).toHaveLength(12);
    });

    it("matches exact transliterated names", () => {
      expect(FATIMID_MONTH_NAMES[0]).toBe("Moharram al-Haraam");
      expect(FATIMID_MONTH_NAMES[1]).toBe("Safar al-Muzaffar");
      expect(FATIMID_MONTH_NAMES[2]).toBe("Rabi' al-Awwal");
      expect(FATIMID_MONTH_NAMES[3]).toBe("Rabi' al-Aakhar");
      expect(FATIMID_MONTH_NAMES[4]).toBe("Jumada al-Ula");
      expect(FATIMID_MONTH_NAMES[5]).toBe("Jumada al-Ukhra");
      expect(FATIMID_MONTH_NAMES[6]).toBe("Rajab al-Asab");
      expect(FATIMID_MONTH_NAMES[7]).toBe("Sha'ban al-Karim");
      expect(FATIMID_MONTH_NAMES[8]).toBe("Ramadan al-Moazzam");
      expect(FATIMID_MONTH_NAMES[9]).toBe("Shawwal al-Mukarram");
      expect(FATIMID_MONTH_NAMES[10]).toBe("Zilqadah al-Haram");
      expect(FATIMID_MONTH_NAMES[11]).toBe("Zilhajj al-Haraam");

      expect(FATIMID_MONTH_NAMES_SHORT[0]).toBe("Moharram");
      expect(FATIMID_MONTH_NAMES_SHORT[1]).toBe("Safar");
      expect(FATIMID_MONTH_NAMES_SHORT[2]).toBe("Rabi I");
      expect(FATIMID_MONTH_NAMES_SHORT[3]).toBe("Rabi II");
      expect(FATIMID_MONTH_NAMES_SHORT[4]).toBe("Jumada I");
      expect(FATIMID_MONTH_NAMES_SHORT[5]).toBe("Jumada II");
      expect(FATIMID_MONTH_NAMES_SHORT[6]).toBe("Rajab");
      expect(FATIMID_MONTH_NAMES_SHORT[7]).toBe("Sha'ban");
      expect(FATIMID_MONTH_NAMES_SHORT[8]).toBe("Ramadan");
      expect(FATIMID_MONTH_NAMES_SHORT[9]).toBe("Shawwal");
      expect(FATIMID_MONTH_NAMES_SHORT[10]).toBe("Zilqad");
      expect(FATIMID_MONTH_NAMES_SHORT[11]).toBe("Zilhaj");
    });

    it("getMonthName retrieves month names correctly", () => {
      expect(getMonthName(1)).toBe("Moharram al-Haraam");
      expect(getMonthName(1, "long")).toBe("Moharram al-Haraam");
      expect(getMonthName(1, "short")).toBe("Moharram");
      expect(getMonthName(9, "long")).toBe("Ramadan al-Moazzam");
      expect(getMonthName(9, "short")).toBe("Ramadan");
      expect(getMonthName(12, "long")).toBe("Zilhajj al-Haraam");
      expect(getMonthName(12, "short")).toBe("Zilhaj");

      expect(getMonthName(0)).toBe("");
      expect(getMonthName(13)).toBe("");
    });
  });
});
