import type { CalendarEngine, PlainDate } from "../engine/types.js";
import { DEFAULT_MONTH_LABELS, type MonthLabels, getMonthName } from "../engine/labels.js";

/**
 * Format a PlainDate into a machine-readable value string.
 *
 * Supported format tokens:
 * - `YYYY`: 4-digit zero-padded year (ASCII digits)
 * - `MM`: 2-digit zero-padded month (01-12)
 * - `M`: Month number without zero-padding (1-12)
 * - `DD`: 2-digit zero-padded day of month (01-30)
 * - `D`: Day number without zero-padding (1-30)
 * - `MMMM`: Full transliterated month name
 * - `MMM`: Short transliterated month name
 *
 * Default pattern: "YYYY-MM-DD"
 * All numerical digits are strictly ASCII characters (0-9).
 */
export function formatValue(
  date: PlainDate,
  pattern: string = "YYYY-MM-DD",
  labels: MonthLabels = DEFAULT_MONTH_LABELS,
): string {
  const yearStr =
    date.year < 0
      ? `-${String(Math.abs(date.year)).padStart(4, "0")}`
      : String(date.year).padStart(4, "0");

  const monthStr2 = String(date.month).padStart(2, "0");
  const monthStr1 = String(date.month);
  const dayStr2 = String(date.day).padStart(2, "0");
  const dayStr1 = String(date.day);

  return pattern.replace(/MMMM|MMM|YYYY|MM|M|DD|D/g, (token) => {
    switch (token) {
      case "YYYY":
        return yearStr;
      case "MMMM":
        return getMonthName(date.month, "long", labels);
      case "MMM":
        return getMonthName(date.month, "short", labels);
      case "MM":
        return monthStr2;
      case "M":
        return monthStr1;
      case "DD":
        return dayStr2;
      case "D":
        return dayStr1;
      default:
        return token;
    }
  });
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

type GroupRole = "year" | "month" | "day" | "monthLong" | "monthShort";

interface TokenDef {
  role?: GroupRole;
  literal?: string;
  exactLength?: number;
}

/**
 * Strict parser for machine date strings.
 *
 * Parses a string formatted according to the given pattern and validates
 * that year, month, and day are valid civil calendar units.
 *
 * If an engine is provided, day bounds are strictly validated against
 * engine.daysInMonth(year, month) and month against engine.monthsInYear(year).
 *
 * Returns `PlainDate` if valid, or `null` if the input is malformed, has out-of-bounds
 * units, or contains non-ASCII digits.
 */
export function parseValue(
  str: string,
  pattern: string = "YYYY-MM-DD",
  engine?: CalendarEngine,
  labels: MonthLabels = DEFAULT_MONTH_LABELS,
): PlainDate | null {
  if (typeof str !== "string" || str.length === 0) {
    return null;
  }

  const tokenRegex = /MMMM|MMM|YYYY|MM|M|DD|D/g;
  const tokens: TokenDef[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(pattern)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        literal: pattern.slice(lastIndex, match.index),
      });
    }
    const token = match[0];
    if (token === "YYYY") {
      tokens.push({ role: "year" });
    } else if (token === "MMMM") {
      tokens.push({ role: "monthLong" });
    } else if (token === "MMM") {
      tokens.push({ role: "monthShort" });
    } else if (token === "MM") {
      tokens.push({ role: "month", exactLength: 2 });
    } else if (token === "M") {
      tokens.push({ role: "month" });
    } else if (token === "DD") {
      tokens.push({ role: "day", exactLength: 2 });
    } else if (token === "D") {
      tokens.push({ role: "day" });
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < pattern.length) {
    tokens.push({
      literal: pattern.slice(lastIndex),
    });
  }

  const groupRoles: GroupRole[] = [];
  let regexSource = "^";

  for (const token of tokens) {
    if (token.literal !== undefined) {
      regexSource += escapeRegex(token.literal);
    } else if (token.role !== undefined) {
      groupRoles.push(token.role);
      switch (token.role) {
        case "year":
          // Supports negative and 4+ digit years (ASCII digits only)
          regexSource += "(-?[0-9]{4,}|[0-9]{1,4})";
          break;
        case "month":
          regexSource += token.exactLength === 2 ? "([0-9]{2})" : "([0-9]{1,2})";
          break;
        case "day":
          regexSource += token.exactLength === 2 ? "([0-9]{2})" : "([0-9]{1,2})";
          break;
        case "monthLong": {
          const names = [...labels.long]
            .map(escapeRegex)
            .sort((a, b) => b.length - a.length)
            .join("|");
          regexSource += `(${names})`;
          break;
        }
        case "monthShort": {
          const names = [...labels.short]
            .map(escapeRegex)
            .sort((a, b) => b.length - a.length)
            .join("|");
          regexSource += `(${names})`;
          break;
        }
      }
    }
  }

  regexSource += "$";

  const compiledRegex = new RegExp(regexSource);
  const result = compiledRegex.exec(str);
  if (!result) {
    return null;
  }

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  for (let i = 0; i < groupRoles.length; i++) {
    const role = groupRoles[i];
    const captured = result[i + 1];
    if (captured === undefined) {
      return null;
    }

    if (role === "year") {
      year = parseInt(captured, 10);
    } else if (role === "month") {
      month = parseInt(captured, 10);
    } else if (role === "day") {
      day = parseInt(captured, 10);
    } else if (role === "monthLong") {
      const idx = labels.long.indexOf(captured);
      if (idx === -1) return null;
      month = idx + 1;
    } else if (role === "monthShort") {
      const idx = labels.short.indexOf(captured);
      if (idx === -1) return null;
      month = idx + 1;
    }
  }

  if (year === null || month === null || day === null) {
    return null;
  }

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const maxMonths = engine ? engine.monthsInYear(year) : 12;
  if (month < 1 || month > maxMonths) {
    return null;
  }

  const maxDays = engine ? engine.daysInMonth(year, month) : 30;
  if (day < 1 || day > maxDays) {
    return null;
  }

  return { year, month, day };
}
