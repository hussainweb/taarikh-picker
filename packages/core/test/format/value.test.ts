import { describe, expect, it } from "vitest";
import { fatimidAstronomicalCalendar } from "../../src/engine/index.js";
import { formatValue, parseValue } from "../../src/format/index.js";

describe("formatValue", () => {
  it("formats date to default YYYY-MM-DD pattern with zero-padding", () => {
    expect(formatValue({ year: 1445, month: 9, day: 1 })).toBe("1445-09-01");
    expect(formatValue({ year: 1445, month: 12, day: 29 })).toBe("1445-12-29");
    expect(formatValue({ year: 1, month: 1, day: 1 })).toBe("0001-01-01");
    expect(formatValue({ year: 25, month: 10, day: 5 })).toBe("0025-10-05");
  });

  it("always outputs ASCII digits (0-9)", () => {
    const formatted = formatValue({ year: 1445, month: 9, day: 1 });
    for (const char of formatted) {
      if (char !== "-") {
        const code = char.charCodeAt(0);
        expect(code).toBeGreaterThanOrEqual(48); // '0'
        expect(code).toBeLessThanOrEqual(57); // '9'
      }
    }
  });

  it("handles negative and astronomical year 0", () => {
    expect(formatValue({ year: 0, month: 1, day: 1 })).toBe("0000-01-01");
    expect(formatValue({ year: -5, month: 2, day: 10 })).toBe("-0005-02-10");
    expect(formatValue({ year: -1445, month: 9, day: 1 })).toBe("-1445-09-01");
  });

  it("supports custom date patterns", () => {
    const date = { year: 1445, month: 9, day: 1 };
    expect(formatValue(date, "YYYY/MM/DD")).toBe("1445/09/01");
    expect(formatValue(date, "DD/MM/YYYY")).toBe("01/09/1445");
    expect(formatValue(date, "DD-MM-YYYY")).toBe("01-09-1445");
    expect(formatValue(date, "D/M/YYYY")).toBe("1/9/1445");
    expect(formatValue(date, "YYYY-M-D")).toBe("1445-9-1");
  });

  it("supports month name tokens MMMM and MMM", () => {
    const date = { year: 1445, month: 9, day: 1 };
    expect(formatValue(date, "D MMMM YYYY")).toBe("1 Ramadan al-Moazzam 1445");
    expect(formatValue(date, "D MMM YYYY")).toBe("1 Ramadan 1445");
  });

  it("respects custom month labels for MMMM and MMM", () => {
    const customLabels = {
      long: [
        "M1",
        "M2",
        "M3",
        "M4",
        "M5",
        "M6",
        "M7",
        "M8",
        "Ramadanul Mubarak",
        "M10",
        "M11",
        "M12",
      ],
      short: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "Ram", "S10", "S11", "S12"],
    };
    const date = { year: 1445, month: 9, day: 1 };
    expect(formatValue(date, "D MMMM YYYY", customLabels)).toBe("1 Ramadanul Mubarak 1445");
    expect(formatValue(date, "D MMM YYYY", customLabels)).toBe("1 Ram 1445");
  });
});

describe("parseValue", () => {
  it("parses valid YYYY-MM-DD strings to PlainDate", () => {
    expect(parseValue("1445-09-01")).toEqual({ year: 1445, month: 9, day: 1 });
    expect(parseValue("0001-01-01")).toEqual({ year: 1, month: 1, day: 1 });
    expect(parseValue("-0005-02-10")).toEqual({ year: -5, month: 2, day: 10 });
    expect(parseValue("0000-01-01")).toEqual({ year: 0, month: 1, day: 1 });
  });

  it("validates day against calendar engine", () => {
    // Safar (month 2) has 29 days
    expect(parseValue("1445-02-29", "YYYY-MM-DD", fatimidAstronomicalCalendar)).toEqual({
      year: 1445,
      month: 2,
      day: 29,
    });
    expect(parseValue("1445-02-30", "YYYY-MM-DD", fatimidAstronomicalCalendar)).toBeNull();

    // 1445 is kabisa: month 12 has 30 days
    expect(parseValue("1445-12-30", "YYYY-MM-DD", fatimidAstronomicalCalendar)).toEqual({
      year: 1445,
      month: 12,
      day: 30,
    });

    // 1444 is non-kabisa: month 12 has 29 days
    expect(parseValue("1444-12-29", "YYYY-MM-DD", fatimidAstronomicalCalendar)).toEqual({
      year: 1444,
      month: 12,
      day: 29,
    });
    expect(parseValue("1444-12-30", "YYYY-MM-DD", fatimidAstronomicalCalendar)).toBeNull();
  });

  it("rejects out-of-range dates", () => {
    // Month out of range
    expect(parseValue("1445-00-01")).toBeNull();
    expect(parseValue("1445-13-01")).toBeNull();

    // Day out of range
    expect(parseValue("1445-09-00")).toBeNull();
    expect(parseValue("1445-09-31")).toBeNull();
  });

  it("strictly rejects malformed or mismatching strings", () => {
    expect(parseValue("")).toBeNull();
    expect(parseValue("invalid")).toBeNull();
    expect(parseValue("1445-09")).toBeNull();
    expect(parseValue("1445/09/01", "YYYY-MM-DD")).toBeNull();
    // In YYYY-MM-DD, MM and DD require 2 digits
    expect(parseValue("1445-9-1", "YYYY-MM-DD")).toBeNull();
    // Trailing or leading garbage
    expect(parseValue("1445-09-01 ")).toBeNull();
    expect(parseValue(" 1445-09-01")).toBeNull();
    expect(parseValue("1445-09-01extra")).toBeNull();
  });

  it("strictly rejects non-ASCII digits", () => {
    // Arabic-Indic digits must not parse as valid value format
    expect(parseValue("١٤٤٥-٠٩-٠١")).toBeNull();
  });

  it("supports parsing custom patterns", () => {
    expect(parseValue("1/9/1445", "D/M/YYYY")).toEqual({ year: 1445, month: 9, day: 1 });
    expect(parseValue("01/09/1445", "DD/MM/YYYY")).toEqual({ year: 1445, month: 9, day: 1 });
    expect(parseValue("1445/09/01", "YYYY/MM/DD")).toEqual({ year: 1445, month: 9, day: 1 });
    expect(parseValue("1445-9-1", "YYYY-M-D")).toEqual({ year: 1445, month: 9, day: 1 });
  });

  it("supports parsing MMMM and MMM tokens", () => {
    expect(parseValue("1 Ramadan al-Moazzam 1445", "D MMMM YYYY")).toEqual({
      year: 1445,
      month: 9,
      day: 1,
    });
    expect(parseValue("1 Ramadan 1445", "D MMM YYYY")).toEqual({
      year: 1445,
      month: 9,
      day: 1,
    });
    expect(parseValue("1 FakeMonth 1445", "D MMMM YYYY")).toBeNull();
  });

  it("round-trips formatValue and parseValue for valid dates", () => {
    const dates = [
      { year: 1445, month: 9, day: 1 },
      { year: 1445, month: 12, day: 30 },
      { year: 1444, month: 12, day: 29 },
      { year: 1, month: 1, day: 1 },
      { year: 0, month: 5, day: 15 },
      { year: -10, month: 7, day: 20 },
    ];

    for (const date of dates) {
      const formatted = formatValue(date);
      const parsed = parseValue(formatted, "YYYY-MM-DD", fatimidAstronomicalCalendar);
      expect(parsed).toEqual(date);
    }
  });
});
