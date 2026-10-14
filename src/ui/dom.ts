import { DEFAULT_MONTH_LABELS } from "../engine/labels.js";
import type { ResolvedPickerLabels } from "./types.js";

let idCounter: number = 0;

/**
 * Generate a sequential unique identifier.
 */
export function nextUniqueId(prefix: string = "tp"): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Reset unique identifier counter (useful in tests).
 */
export function resetUniqueIdCounter(): void {
  idCounter = 0;
}

/**
 * Default resolved labels for the datepicker UI.
 */
export const DEFAULT_LABELS: ResolvedPickerLabels = {
  chooseDate: "Choose date",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  monthSelect: "Select month",
  yearSelect: "Select year",
  today: "Today",
  clear: "Clear",
  dialogTitle: "Choose date",
  months: DEFAULT_MONTH_LABELS,
  invalidDate: "Please enter a valid date",
  outOfRange: "Date is out of range",
};

/**
 * Inline SVG calendar icon for the trigger button.
 */
export const CALENDAR_SVG_ICON: string =
  `<svg class="tp-icon-calendar" width="18" height="18" viewBox="0 0 24 24" fill="none" ` +
  `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
  `aria-hidden="true" focusable="false">` +
  `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>` +
  `<line x1="16" y1="2" x2="16" y2="6"></line>` +
  `<line x1="8" y1="2" x2="8" y2="6"></line>` +
  `<line x1="3" y1="10" x2="21" y2="10"></line>` +
  `</svg>`;
