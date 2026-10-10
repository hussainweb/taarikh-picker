import { describe, expect, it } from "vitest";
import { fatimidAstronomicalCalendar, weekday } from "../../src/engine/index.js";
import {
  formatDayAriaLabel,
  formatDisplay,
  formatMonthHeading,
  getWeekdayNames,
} from "../../src/format/index.js";

describe("formatDisplay", () => {
  const sampleDate = { year: 1445, month: 9, day: 1 }; // 1 Ramadan 1445

  it("formats date to default display string (day month year)", () => {
    expect(formatDisplay(sampleDate, fatimidAstronomicalCalendar)).toBe(
      "1 Ramadan al-Moazzam 1445",
    );
  });

  it("supports short month names", () => {
    expect(formatDisplay(sampleDate, fatimidAstronomicalCalendar, { month: "short" })).toBe(
      "1 Ramadan 1445",
    );
  });

  it("supports 2-digit day and 2-digit year", () => {
    expect(
      formatDisplay(sampleDate, fatimidAstronomicalCalendar, {
        day: "2-digit",
        year: "2-digit",
      }),
    ).toBe("01 Ramadan al-Moazzam 45");
  });

  it("supports omitting day or year for headings or partial displays", () => {
    // Month heading
    expect(formatDisplay(sampleDate, fatimidAstronomicalCalendar, { day: false })).toBe(
      "Ramadan al-Moazzam 1445",
    );

    // Day and month without year
    expect(formatDisplay(sampleDate, fatimidAstronomicalCalendar, { year: false })).toBe(
      "1 Ramadan al-Moazzam",
    );
  });

  it("includes weekday when specified", () => {
    const formatted = formatDisplay(sampleDate, fatimidAstronomicalCalendar, {
      weekday: "long",
    });
    // Check that it starts with the correct weekday name
    const w = weekday(sampleDate, fatimidAstronomicalCalendar);
    const dayNames = getWeekdayNames("en", "long");
    const expectedWeekday = dayNames[w];
    expect(formatted).toBe(`${expectedWeekday}, 1 Ramadan al-Moazzam 1445`);
  });

  it("supports custom labels dictionary", () => {
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
    expect(
      formatDisplay(sampleDate, fatimidAstronomicalCalendar, {
        labels: customLabels,
      }),
    ).toBe("1 Ramadanul Mubarak 1445");
  });

  it("localizes numerals when requested via locale", () => {
    const arabicFormatted = formatDisplay(sampleDate, fatimidAstronomicalCalendar, {
      locale: "ar-EG",
    });
    // Egyptian Arabic uses Eastern Arabic numerals: ١ (1), ١٤٤٥ (1445)
    expect(arabicFormatted).toContain("١");
    expect(arabicFormatted).toContain("١٤٤٥");
  });
});

describe("getWeekdayNames", () => {
  it("returns 7 weekday names starting with Sunday by default", () => {
    const narrow = getWeekdayNames("en", "narrow");
    expect(narrow).toHaveLength(7);
    expect(narrow[0]).toBe("S"); // Sunday

    const short = getWeekdayNames("en", "short");
    expect(short).toHaveLength(7);
    expect(short[0]).toBe("Sun");
    expect(short[6]).toBe("Sat");

    const long = getWeekdayNames("en", "long");
    expect(long).toHaveLength(7);
    expect(long[0]).toBe("Sunday");
    expect(long[6]).toBe("Saturday");
  });

  it("respects firstDay parameter", () => {
    // Monday first
    const mondayFirst = getWeekdayNames("en", "short", 1);
    expect(mondayFirst[0]).toBe("Mon");
    expect(mondayFirst[6]).toBe("Sun");

    // Saturday first
    const saturdayFirst = getWeekdayNames("en", "short", 6);
    expect(saturdayFirst[0]).toBe("Sat");
    expect(saturdayFirst[1]).toBe("Sun");
  });

  it("localizes weekday names according to locale", () => {
    const french = getWeekdayNames("fr", "long", 0);
    expect(french[0].toLowerCase()).toBe("dimanche");
  });
});

describe("formatDayAriaLabel and formatMonthHeading", () => {
  const date = { year: 1445, month: 9, day: 1 };

  it("formatDayAriaLabel creates an accessible full label", () => {
    const label = formatDayAriaLabel(date, fatimidAstronomicalCalendar, "en");
    const w = weekday(date, fatimidAstronomicalCalendar);
    const dayNames = getWeekdayNames("en", "long");
    expect(label).toBe(`${dayNames[w]}, 1 Ramadan al-Moazzam 1445`);
  });

  it("formatMonthHeading creates clean navigation header label", () => {
    expect(formatMonthHeading(date, fatimidAstronomicalCalendar)).toBe("Ramadan al-Moazzam 1445");
    expect(formatMonthHeading(date, fatimidAstronomicalCalendar, { month: "short" })).toBe(
      "Ramadan 1445",
    );
  });
});
