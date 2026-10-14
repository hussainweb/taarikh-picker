import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { addDays, fatimidAstronomicalCalendar } from "../../src/engine/index.js";

describe("Fatimid Astronomical Calendar - Property-based Tests (tp-il8.2.4)", () => {
  // Arbitrary valid PlainDate generator over years -3000..3000
  const dateArbitrary = fc
    .record({
      year: fc.integer({ min: -3000, max: 3000 }),
      month: fc.integer({ min: 1, max: 12 }),
    })
    .chain(({ year, month }) => {
      const maxDays = fatimidAstronomicalCalendar.daysInMonth(year, month);
      return fc.record({
        year: fc.constant(year),
        month: fc.constant(month),
        day: fc.integer({ min: 1, max: maxDays }),
      });
    });

  it("satisfies round-trip property: fromJulianDay(toJulianDay(date)) == date", () => {
    fc.assert(
      fc.property(dateArbitrary, (date) => {
        const jdn = fatimidAstronomicalCalendar.toJulianDay(date);
        const roundTrip = fatimidAstronomicalCalendar.fromJulianDay(jdn);
        expect(roundTrip).toEqual(date);
      }),
      { numRuns: 2000 },
    );
  });

  it("satisfies JDN round-trip: toJulianDay(fromJulianDay(jdn)) == jdn", () => {
    const minJdn = fatimidAstronomicalCalendar.toJulianDay({ year: -3000, month: 1, day: 1 });
    const maxJdn = fatimidAstronomicalCalendar.toJulianDay({ year: 3000, month: 12, day: 29 });

    fc.assert(
      fc.property(fc.integer({ min: minJdn, max: maxJdn }), (jdn) => {
        const date = fatimidAstronomicalCalendar.fromJulianDay(jdn);
        const roundTripJdn = fatimidAstronomicalCalendar.toJulianDay(date);
        expect(roundTripJdn).toBe(jdn);
      }),
      { numRuns: 2000 },
    );
  });

  it("satisfies contiguity property: consecutive dates map to consecutive JDNs", () => {
    fc.assert(
      fc.property(dateArbitrary, (date) => {
        const jdn = fatimidAstronomicalCalendar.toJulianDay(date);
        const nextDate = addDays(date, 1, fatimidAstronomicalCalendar);
        const nextJdn = fatimidAstronomicalCalendar.toJulianDay(nextDate);
        expect(nextJdn).toBe(jdn + 1);

        const prevDate = addDays(date, -1, fatimidAstronomicalCalendar);
        const prevJdn = fatimidAstronomicalCalendar.toJulianDay(prevDate);
        expect(prevJdn).toBe(jdn - 1);
      }),
      { numRuns: 1000 },
    );
  });

  it("satisfies year length property: sum of daysInMonth equals year length and JDN delta", () => {
    fc.assert(
      fc.property(fc.integer({ min: -3000, max: 3000 }), (year) => {
        let sumDays = 0;
        for (let m = 1; m <= 12; m++) {
          sumDays += fatimidAstronomicalCalendar.daysInMonth(year, m);
        }
        const isKabisa = fatimidAstronomicalCalendar.isKabisa(year);
        const expectedDays = isKabisa ? 355 : 354;
        expect(sumDays).toBe(expectedDays);

        const startOfThisYear = fatimidAstronomicalCalendar.toJulianDay({
          year,
          month: 1,
          day: 1,
        });
        const startOfNextYear = fatimidAstronomicalCalendar.toJulianDay({
          year: year + 1,
          month: 1,
          day: 1,
        });
        expect(startOfNextYear - startOfThisYear).toBe(expectedDays);
      }),
      { numRuns: 1000 },
    );
  });
});
