# @taarikh/core

Pure, headless calendar arithmetic, Fatimid Astronomical Hijri engine, Julian Day Number (JDN) conversions, and date formatting for JavaScript and TypeScript.

[![npm version](https://img.shields.io/npm/v/@taarikh/core.svg)](https://www.npmjs.com/package/@taarikh/core)
[![CI](https://github.com/hussainweb/taarikh-picker/actions/workflows/ci.yml/badge.svg)](https://github.com/hussainweb/taarikh-picker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/hussainweb/taarikh-picker/blob/main/LICENSE)

---

## Features

- **Zero External Dependencies**: Pure vanilla TypeScript compiled to lightweight, tree-shakeable ESM (`"sideEffects": false`). Under 4 KB uncompressed (~1.2 KB gzipped).
- **Strictly Headless**: Zero DOM or browser dependencies (`window`, `document`, and `HTMLElement` are not used). Runs in Node.js (>= 18), Deno, Bun, Cloudflare Workers, React Native, or browser applications.
- **Fatimid Astronomical Hijri Engine**: Astronomical calculation based on the Fatimid tabular calendar, with decoupled Julian Day Number (JDN) conversions matching `hussainweb/date-converter`.
- **Date Arithmetic**: Addition and subtraction across days, months, and leap years (`addDays`, `addMonths`, `addYears`), date comparison (`compareDates`, `isBefore`, `isAfter`, `isSameDay`), and weekday resolution (`weekday`, `weekdayFromJdn`).
- **Formatting & Parsing**: Format to standard zero-padded ASCII values (`formatValue`), parse strings (`parseValue`), render localized display strings (`formatDisplay`), format month headings (`formatMonthHeading`), and retrieve localized weekday names (`getWeekdayNames`).
- **Pluggable Calendar Architecture**: Strongly typed `CalendarEngine` interface allowing custom or non-Gregorian calendar implementations.

---

## Installation

```bash
npm install @taarikh/core
```

---

## Quick Start

### Basic Usage

```ts
import {
  fatimidAstronomicalCalendar,
  formatDisplay,
  formatValue,
  parseValue,
  today,
} from "@taarikh/core";

// Today's Hijri date
const now = today(fatimidAstronomicalCalendar);
console.log(now);
// => { year: 1448, month: 4, day: 22 }

// Format as ISO ASCII value (default "YYYY-MM-DD")
console.log(formatValue(now));
// => "1448-04-22"

// Parse an ASCII string back to PlainDate
const parsed = parseValue("1448-04-22");
console.log(parsed);
// => { year: 1448, month: 4, day: 22 }

// Format for localized human display
console.log(formatDisplay(now, fatimidAstronomicalCalendar, { locale: "ar" }));
// => "٢٢ ربيع الآخر ١٤٤٨"
```

### Gregorian ↔ Hijri Conversion via Julian Day Number

All calendar conversions in `@taarikh/core` are decoupled through Julian Day Numbers (JDN):

```ts
import { fatimidAstronomicalCalendar, gregorianToJulianDay } from "@taarikh/core";

// 1. Convert Gregorian date (2026-10-14) to Julian Day Number
const jdn = gregorianToJulianDay(2026, 10, 14);
console.log("Julian Day:", jdn); // => 2461328

// 2. Convert JDN to Hijri PlainDate
const hijriDate = fatimidAstronomicalCalendar.fromJulianDay(jdn);
console.log("Hijri Date:", hijriDate);
// => { year: 1448, month: 4, day: 2 }

// 3. Convert Hijri PlainDate back to JDN
const convertedJdn = fatimidAstronomicalCalendar.toJulianDay(hijriDate);
console.log("Roundtrip JDN:", convertedJdn); // => 2461328
```

### Date Arithmetic

```ts
import {
  addDays,
  addMonths,
  addYears,
  compareDates,
  fatimidAstronomicalCalendar,
  isBefore,
} from "@taarikh/core";

const date = { year: 1446, month: 9, day: 29 }; // 29th Ramadan 1446

// Add days (handles month rollover and leap years)
const nextDay = addDays(date, 1, fatimidAstronomicalCalendar);
// => { year: 1446, month: 9, day: 30 } (Ramadan has 30 days)

// Add months (clamps days if target month has fewer days)
const nextMonth = addMonths(date, 1, fatimidAstronomicalCalendar);
// => { year: 1446, month: 10, day: 29 }

// Add years
const nextYear = addYears(date, 1, fatimidAstronomicalCalendar);
// => { year: 1447, month: 9, day: 29 }

// Comparison
console.log(compareDates(date, nextDay)); // => -1
console.log(isBefore(date, nextDay)); // => true
```

### Localized Formatting & Weekdays

```ts
import { fatimidAstronomicalCalendar, formatMonthHeading, getWeekdayNames } from "@taarikh/core";

// Localized month headings
console.log(formatMonthHeading(1448, 9, fatimidAstronomicalCalendar, { locale: "en" }));
// => "Ramadan 1448"

console.log(formatMonthHeading(1448, 9, fatimidAstronomicalCalendar, { locale: "ar" }));
// => "رمضان ١٤٤٨"

// Weekday names derived from Intl or customized
const weekdays = getWeekdayNames(fatimidAstronomicalCalendar, {
  locale: "ar",
  firstDayOfWeek: 6, // 6 = Saturday
  format: "short",
});
console.log(weekdays);
// => ["سبت", "أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"]
```

---

## API Reference

### Calendar Engine

#### `fatimidAstronomicalCalendar`

An instance of `FatimidAstronomicalCalendar` implementing `CalendarEngine`:

- `toJulianDay(date: PlainDate): number`: Converts a Hijri date to Julian Day Number.
- `fromJulianDay(jdn: number): PlainDate`: Converts a Julian Day Number to a Hijri date.
- `daysInMonth(year: number, month: number): number`: Returns the number of days in the specified month (29 or 30).
- `isLeapYear(year: number): boolean`: Returns true if the Hijri year is a leap year (years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 in a 30-year cycle).
- `monthsInYear(year: number): number`: Returns 12.

### Functions

#### Date Arithmetic & Queries

- `today(engine: CalendarEngine): PlainDate`: Returns current date in the specified calendar.
- `addDays(date: PlainDate, days: number, engine: CalendarEngine): PlainDate`
- `addMonths(date: PlainDate, months: number, engine: CalendarEngine): PlainDate`
- `addYears(date: PlainDate, years: number, engine: CalendarEngine): PlainDate`
- `weekday(date: PlainDate, engine: CalendarEngine): number`: Returns weekday (0 = Sunday .. 6 = Saturday).
- `weekdayFromJdn(jdn: number): number`: Returns weekday from Julian Day Number.
- `compareDates(a: PlainDate, b: PlainDate): number`: Returns negative if `a < b`, 0 if `a === b`, positive if `a > b`.
- `isSameDay(a: PlainDate, b: PlainDate): boolean`
- `isBefore(a: PlainDate, b: PlainDate): boolean`
- `isAfter(a: PlainDate, b: PlainDate): boolean`
- `gregorianToJulianDay(year: number, month: number, day: number): number`

#### Formatting & Parsing

- `formatValue(date: PlainDate, pattern?: string): string`: Formats a date into an ASCII value string (default `"YYYY-MM-DD"`).
- `parseValue(value: string, pattern?: string): PlainDate | null`: Parses an ASCII value string into a `PlainDate` or `null`.
- `formatDisplay(date: PlainDate, engine: CalendarEngine, options?: DisplayOptions): string`: Formats a date for human display with localized numerals and month names.
- `formatMonthHeading(year: number, month: number, engine: CalendarEngine, options?: DisplayOptions): string`
- `getWeekdayNames(engine: CalendarEngine, options?: { locale?: string; firstDayOfWeek?: number; format?: "long" | "short" | "narrow"; labels?: WeekdayLabels }): string[]`
- `getMonthName(month: number, labels?: MonthLabels, format?: "long" | "short"): string`

---

## TypeScript Types

```ts
export interface PlainDate {
  readonly year: number;
  readonly month: number; // 1-indexed (1..12)
  readonly day: number; // 1-indexed (1..30)
}

export interface CalendarEngine {
  readonly id: string;
  toJulianDay(date: PlainDate): number;
  fromJulianDay(jdn: number): PlainDate;
  daysInMonth(year: number, month: number): number;
  isLeapYear(year: number): boolean;
  monthsInYear(year: number): number;
}
```

---

## Related Packages

- [`@taarikh/picker`](https://www.npmjs.com/package/@taarikh/picker): Accessible, zero-dependency HTML/DOM Hijri date picker component built on `@taarikh/core`.

---

## License

MIT © [Hussain Abbas](https://github.com/hussainweb)
