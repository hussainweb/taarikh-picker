import "./style.css";

import type { CalendarEngine, PlainDate } from "@taarikh/core";
import { fatimidAstronomicalCalendar } from "@taarikh/core";
import { DialogShell } from "./ui/dialog.js";
import type { DialogElements, PickerLabels } from "./ui/types.js";

export type {
  CalendarEngine,
  DisplayOptions,
  MonthLabels,
  PlainDate,
  WeekdayLabels,
} from "@taarikh/core";
export {
  DEFAULT_MONTH_LABELS,
  FATIMID_MONTH_NAMES,
  FATIMID_MONTH_NAMES_SHORT,
  FatimidAstronomicalCalendar,
  addDays,
  addMonths,
  addYears,
  clearFormatterCache,
  compareDates,
  fatimidAstronomicalCalendar,
  formatDayAriaLabel,
  formatDisplay,
  formatMonthHeading,
  formatValue,
  formatYear,
  getDateTimeFormatter,
  getMonthName,
  getNumberFormatter,
  getWeekdayNames,
  gregorianToJulianDay,
  inferDateOrder,
  isAfter,
  isArabicScriptLocale,
  isBefore,
  isSameDay,
  parseValue,
  today,
  weekday,
  weekdayFromJdn,
} from "@taarikh/core";

export type { DialogElements, PickerLabels, ResolvedPickerLabels } from "./ui/types.js";
export { DEFAULT_LABELS } from "./ui/dom.js";

/**
 * Options for configuring TaarikhPicker.
 */
export interface TaarikhPickerOptions {
  readonly engine?: CalendarEngine | undefined;
  readonly labels?: PickerLabels | undefined;
  readonly firstDayOfWeek?: number | undefined;
  readonly minDate?: PlainDate | undefined;
  readonly maxDate?: PlainDate | undefined;
  readonly valueFormat?: string | undefined;
  /** Alias for valueFormat */
  readonly valuePattern?: string | undefined;
  readonly dir?: "ltr" | "rtl" | "auto" | undefined;
  readonly isRtl?: boolean | undefined;
  readonly locale?: string | undefined;
  readonly initialDate?: PlainDate | undefined;
  readonly selectedDate?: PlainDate | undefined;
  readonly idPrefix?: string | undefined;
  readonly onMonthChange?: ((date: PlainDate) => void) | undefined;
  readonly onToday?: ((todayDate: PlainDate) => void) | undefined;
  readonly onClear?: (() => void) | undefined;
  readonly onOpen?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly onSelect?: ((date: PlainDate) => void) | undefined;
}

/**
 * Determine the default first day of the week (0 = Sunday .. 6 = Saturday)
 * using Intl.Locale getWeekInfo when supported, falling back to 0 (Sunday).
 */
export function getDefaultFirstDayOfWeek(locale?: string): number {
  try {
    const loc = new Intl.Locale(
      locale || (typeof navigator !== "undefined" ? navigator.language : "en"),
    );
    const weekInfo =
      (loc as unknown as { getWeekInfo?: () => { firstDay?: number } }).getWeekInfo?.() ??
      (loc as unknown as { weekInfo?: { firstDay?: number } }).weekInfo;
    if (weekInfo && typeof weekInfo.firstDay === "number") {
      // ISO firstDay: 1 (Mon) .. 7 (Sun) -> map to 0 (Sun) .. 6 (Sat)
      return weekInfo.firstDay % 7;
    }
  } catch {
    // Fallback if Intl.Locale or getWeekInfo is unsupported
  }
  return 0;
}

/**
 * Resolve whether the picker should operate in RTL layout mode.
 */
export function resolveIsRtl(
  input: HTMLElement,
  dir?: "ltr" | "rtl" | "auto",
  isRtl?: boolean,
): boolean {
  if (dir === "rtl") {
    return true;
  }
  if (dir === "ltr") {
    return false;
  }
  if (dir === undefined && isRtl !== undefined) {
    return isRtl;
  }
  if (typeof document !== "undefined") {
    const closestDir = input.closest?.("[dir]")?.getAttribute("dir");
    if (closestDir) {
      const lower = closestDir.toLowerCase();
      if (lower === "rtl") {
        return true;
      }
      if (lower === "ltr") {
        return false;
      }
    }
    if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
      try {
        const computed = window.getComputedStyle(input).direction;
        if (computed === "rtl") {
          return true;
        }
        if (computed === "ltr") {
          return false;
        }
      } catch {
        // Fallback
      }
    }
    if (document.documentElement?.dir) {
      return document.documentElement.dir.toLowerCase() === "rtl";
    }
    if (document.body?.dir) {
      return document.body.dir.toLowerCase() === "rtl";
    }
    if (document.dir) {
      return document.dir.toLowerCase() === "rtl";
    }
  }
  if (isRtl !== undefined) {
    return isRtl;
  }
  return false;
}

/**
 * Accessible datepicker for Hijri calendars.
 */
export class TaarikhPicker {
  private readonly input: HTMLInputElement;
  private readonly options: TaarikhPickerOptions;
  private dialogShell: DialogShell | undefined;

  public constructor(input: HTMLInputElement, options?: TaarikhPickerOptions) {
    this.input = input;
    this.options = options ?? {};

    const firstDayOfWeek =
      this.options.firstDayOfWeek ?? getDefaultFirstDayOfWeek(this.options.locale);

    const isRtl = resolveIsRtl(input, this.options.dir, this.options.isRtl);

    this.dialogShell = new DialogShell(this.input, {
      labels: this.options.labels,
      minDate: this.options.minDate,
      maxDate: this.options.maxDate,
      calendarEngine: this.options.engine ?? fatimidAstronomicalCalendar,
      initialDate: this.options.initialDate,
      selectedDate: this.options.selectedDate,
      firstDayOfWeek,
      locale: this.options.locale,
      isRtl,
      idPrefix: this.options.idPrefix,
      valuePattern: this.options.valueFormat ?? this.options.valuePattern,
      onMonthChange: this.options.onMonthChange,
      onToday: this.options.onToday,
      onClear: this.options.onClear,
      onOpen: this.options.onOpen,
      onClose: this.options.onClose,
      onSelect: this.options.onSelect,
    });
  }

  public open(): void {
    this.dialogShell?.open();
  }

  public close(): void {
    this.dialogShell?.close();
  }

  public isOpen(): boolean {
    return this.dialogShell?.isOpen() ?? false;
  }

  public getDate(): PlainDate | null {
    return this.dialogShell?.getDate() ?? null;
  }

  public setDate(date: PlainDate | null | undefined): void {
    this.dialogShell?.setDate(date);
  }

  public getInput(): HTMLInputElement {
    return this.input;
  }

  public getElements(): DialogElements | undefined {
    return this.dialogShell?.getElements();
  }

  public getVisibleDate(): PlainDate | undefined {
    return this.dialogShell?.getVisibleDate();
  }

  public setVisibleDate(date: PlainDate): void {
    this.dialogShell?.setVisibleDate(date);
  }

  public destroy(): void {
    this.dialogShell?.destroy();
    this.dialogShell = undefined;
  }

  public [Symbol.dispose](): void {
    this.destroy();
  }
}

/**
 * Public factory function to initialize a TaarikhPicker on an input element.
 */
export function createPicker(
  input: HTMLInputElement,
  options?: TaarikhPickerOptions,
): TaarikhPicker {
  return new TaarikhPicker(input, options);
}
