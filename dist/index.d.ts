import { CalendarEngine, CalendarEngine as CalendarEngine$1, DEFAULT_MONTH_LABELS, DisplayOptions, FATIMID_MONTH_NAMES, FATIMID_MONTH_NAMES_SHORT, FatimidAstronomicalCalendar, MonthLabels, MonthLabels as MonthLabels$1, PlainDate, PlainDate as PlainDate$1, WeekdayLabels, WeekdayLabels as WeekdayLabels$1, addDays, addMonths, addYears, clearFormatterCache, compareDates, fatimidAstronomicalCalendar, formatDayAriaLabel, formatDisplay, formatMonthHeading, formatValue, formatYear, getDateTimeFormatter, getMonthName, getNumberFormatter, getWeekdayNames, gregorianToJulianDay, inferDateOrder, isAfter, isArabicScriptLocale, isBefore, isSameDay, parseValue, today, weekday, weekdayFromJdn } from "@taarikh/core";
//#region src/ui/types.d.ts
/**
 * Localisable labels for the datepicker dialog shell and controls.
 */
interface PickerLabels {
  readonly chooseDate?: string | undefined;
  readonly trigger?: string | undefined;
  readonly open?: string | undefined;
  readonly previousMonth?: string | undefined;
  readonly prev?: string | undefined;
  readonly nextMonth?: string | undefined;
  readonly next?: string | undefined;
  readonly monthSelect?: string | undefined;
  readonly yearSelect?: string | undefined;
  readonly today?: string | undefined;
  readonly clear?: string | undefined;
  readonly close?: string | undefined;
  readonly dialogTitle?: string | undefined;
  readonly months?: MonthLabels$1 | undefined;
  readonly weekdays?: WeekdayLabels$1 | readonly string[] | undefined;
  readonly invalidDate?: string | undefined;
  readonly outOfRange?: string | undefined;
  readonly liveRegion?: ((monthName: string, year: string) => string) | string | undefined;
}
/**
 * Concrete resolved labels guaranteed to be non-undefined strings.
 */
interface ResolvedPickerLabels {
  readonly chooseDate: string;
  readonly previousMonth: string;
  readonly prev: string;
  readonly nextMonth: string;
  readonly next: string;
  readonly monthSelect: string;
  readonly yearSelect: string;
  readonly today: string;
  readonly clear: string;
  readonly close: string;
  readonly dialogTitle: string;
  readonly months: MonthLabels$1;
  readonly weekdays?: WeekdayLabels$1 | readonly string[] | undefined;
  readonly invalidDate: string;
  readonly outOfRange: string;
  readonly liveRegion?: ((monthName: string, year: string) => string) | string | undefined;
}
/**
 * References to the DOM elements created for the calendar dialog shell.
 */
interface DialogElements {
  readonly trigger: HTMLButtonElement;
  readonly dialog: HTMLDialogElement;
  readonly title: HTMLElement;
  readonly header: HTMLElement;
  readonly btnPrev: HTMLButtonElement;
  readonly btnNext: HTMLButtonElement;
  readonly selectMonth: HTMLSelectElement;
  readonly selectYear: HTMLSelectElement;
  readonly liveRegion: HTMLDivElement;
  readonly gridContainer: HTMLDivElement;
  readonly footer: HTMLElement;
  readonly btnToday: HTMLButtonElement;
  readonly btnClear: HTMLButtonElement;
  readonly btnClose?: HTMLButtonElement | undefined;
  readonly grid?: HTMLTableElement | undefined;
}
//#endregion
//#region src/ui/dom.d.ts
/**
 * Default resolved labels for the datepicker UI.
 */
export declare const DEFAULT_LABELS: ResolvedPickerLabels;
//#endregion
//#region src/index.d.ts
/**
 * Options for configuring TaarikhPicker.
 */
export interface TaarikhPickerOptions {
  readonly engine?: CalendarEngine$1 | undefined;
  readonly labels?: PickerLabels | undefined;
  readonly firstDayOfWeek?: number | undefined;
  readonly minDate?: PlainDate$1 | undefined;
  readonly maxDate?: PlainDate$1 | undefined;
  readonly valueFormat?: string | undefined;
  /** Alias for valueFormat */
  readonly valuePattern?: string | undefined;
  readonly dir?: "ltr" | "rtl" | "auto" | undefined;
  readonly isRtl?: boolean | undefined;
  readonly locale?: string | undefined;
  readonly initialDate?: PlainDate$1 | undefined;
  readonly selectedDate?: PlainDate$1 | undefined;
  readonly idPrefix?: string | undefined;
  readonly onMonthChange?: ((date: PlainDate$1) => void) | undefined;
  readonly onToday?: ((todayDate: PlainDate$1) => void) | undefined;
  readonly onClear?: (() => void) | undefined;
  readonly onOpen?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly onSelect?: ((date: PlainDate$1) => void) | undefined;
}
/**
 * Determine the default first day of the week (0 = Sunday .. 6 = Saturday)
 * using Intl.Locale getWeekInfo when supported, falling back to 0 (Sunday).
 */
export declare function getDefaultFirstDayOfWeek(locale?: string): number;
/**
 * Resolve whether the picker should operate in RTL layout mode.
 */
export declare function resolveIsRtl(input: HTMLElement, dir?: "ltr" | "rtl" | "auto", isRtl?: boolean): boolean;
/**
 * Accessible datepicker for Hijri calendars.
 */
export declare class TaarikhPicker {
  private readonly input;
  private readonly options;
  private dialogShell;
  constructor(input: HTMLInputElement, options?: TaarikhPickerOptions);
  open(): void;
  close(): void;
  isOpen(): boolean;
  getDate(): PlainDate$1 | null;
  setDate(date: PlainDate$1 | null | undefined): void;
  getInput(): HTMLInputElement;
  getElements(): DialogElements | undefined;
  getVisibleDate(): PlainDate$1 | undefined;
  setVisibleDate(date: PlainDate$1): void;
  destroy(): void;
  [Symbol.dispose](): void;
}
/**
 * Public factory function to initialize a TaarikhPicker on an input element.
 */
export declare function createPicker(input: HTMLInputElement, options?: TaarikhPickerOptions): TaarikhPicker;
//#endregion
export { type CalendarEngine, DEFAULT_MONTH_LABELS, type DialogElements, type DisplayOptions, FATIMID_MONTH_NAMES, FATIMID_MONTH_NAMES_SHORT, FatimidAstronomicalCalendar, type MonthLabels, type PickerLabels, type PlainDate, type ResolvedPickerLabels, type WeekdayLabels, addDays, addMonths, addYears, clearFormatterCache, compareDates, fatimidAstronomicalCalendar, formatDayAriaLabel, formatDisplay, formatMonthHeading, formatValue, formatYear, getDateTimeFormatter, getMonthName, getNumberFormatter, getWeekdayNames, gregorianToJulianDay, inferDateOrder, isAfter, isArabicScriptLocale, isBefore, isSameDay, parseValue, today, weekday, weekdayFromJdn };
//# sourceMappingURL=index.d.ts.map