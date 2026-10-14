import { describe, expect, it } from "vitest";
import { fatimidAstronomicalCalendar, weekday } from "../../src/engine/index.js";
import fixturesData from "../fixtures/fatimid.json";

interface FixtureEntry {
  type: string;
  year: number;
  month: number;
  day: number;
  jdn: number;
  isKabisa: boolean;
}

describe("Fatimid Astronomical Calendar - PHP Golden Fixtures (tp-il8.2.4)", () => {
  const fixtures = fixturesData.fixtures as FixtureEntry[];

  it("loads golden fixtures dataset generated from hussainweb/date-converter", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(20000);
  });

  describe("Anchors", () => {
    it("anchors 1 Muharram 1 AH = Thursday 15 July 622 (Julian) = JDN 1948439", () => {
      const date = { year: 1, month: 1, day: 1 };
      const jdn = fatimidAstronomicalCalendar.toJulianDay(date);
      expect(jdn).toBe(1948439);

      // JDN round-trip
      expect(fatimidAstronomicalCalendar.fromJulianDay(1948439)).toEqual(date);

      // Thursday is day 4 (Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4)
      const dayOfWeek = weekday(date, fatimidAstronomicalCalendar);
      expect(dayOfWeek).toBe(4);
    });
  });

  describe("Golden Fixtures: 1 Muharram for years 1-1600 AH", () => {
    const muharramFixtures = fixtures.filter((f) => f.type === "muharram_1");

    it("verifies toJulianDay and fromJulianDay for every 1 Muharram (1..1600 AH)", () => {
      expect(muharramFixtures).toHaveLength(1600);
      for (const f of muharramFixtures) {
        const date = { year: f.year, month: f.month, day: f.day };
        const jdn = fatimidAstronomicalCalendar.toJulianDay(date);
        expect(jdn).toBe(f.jdn);

        const reconstructed = fatimidAstronomicalCalendar.fromJulianDay(f.jdn);
        expect(reconstructed).toEqual(date);

        expect(fatimidAstronomicalCalendar.isKabisa(f.year)).toBe(f.isKabisa);
      }
    });
  });

  describe("Golden Fixtures: Month-end dates for years 1-1600 AH", () => {
    const monthEndFixtures = fixtures.filter((f) => f.type === "month_end");

    it("verifies toJulianDay and fromJulianDay for every month end (19,200 months)", () => {
      expect(monthEndFixtures).toHaveLength(19200);
      for (const f of monthEndFixtures) {
        const date = { year: f.year, month: f.month, day: f.day };
        const jdn = fatimidAstronomicalCalendar.toJulianDay(date);
        expect(jdn).toBe(f.jdn);

        const reconstructed = fatimidAstronomicalCalendar.fromJulianDay(f.jdn);
        expect(reconstructed).toEqual(date);

        // Verify daysInMonth matches
        expect(fatimidAstronomicalCalendar.daysInMonth(f.year, f.month)).toBe(f.day);
      }
    });

    it("verifies kabisa Zilhajj 30 specifically", () => {
      const zilhajj30Fixtures = monthEndFixtures.filter((f) => f.month === 12 && f.day === 30);
      expect(zilhajj30Fixtures.length).toBeGreaterThan(0);
      for (const f of zilhajj30Fixtures) {
        expect(f.isKabisa).toBe(true);
        expect(fatimidAstronomicalCalendar.isKabisa(f.year)).toBe(true);
        expect(fatimidAstronomicalCalendar.daysInMonth(f.year, 12)).toBe(30);
      }
    });
  });

  describe("Golden Fixtures: Fixed random sample", () => {
    const randomFixtures = fixtures.filter((f) => f.type === "random_sample");

    it("verifies toJulianDay and fromJulianDay across seeded pseudo-random dates", () => {
      expect(randomFixtures).toHaveLength(1000);
      for (const f of randomFixtures) {
        const date = { year: f.year, month: f.month, day: f.day };
        const jdn = fatimidAstronomicalCalendar.toJulianDay(date);
        expect(jdn).toBe(f.jdn);

        const reconstructed = fatimidAstronomicalCalendar.fromJulianDay(f.jdn);
        expect(reconstructed).toEqual(date);

        expect(fatimidAstronomicalCalendar.isKabisa(f.year)).toBe(f.isKabisa);
      }
    });
  });
});
