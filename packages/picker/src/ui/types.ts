import type { CalendarEngine, MonthLabels, PlainDate, WeekdayLabels } from "@taarikh/core";

/**
 * Localisable labels for the datepicker dialog shell and controls.
 */
export interface PickerLabels {
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
  readonly months?: MonthLabels | undefined;
  readonly weekdays?: WeekdayLabels | readonly string[] | undefined;
  readonly invalidDate?: string | undefined;
  readonly outOfRange?: string | undefined;
  readonly liveRegion?: ((monthName: string, year: string) => string) | string | undefined;
}

/**
 * Concrete resolved labels guaranteed to be non-undefined strings.
 */
export interface ResolvedPickerLabels {
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
  readonly months: MonthLabels;
  readonly weekdays?: WeekdayLabels | readonly string[] | undefined;
  readonly invalidDate: string;
  readonly outOfRange: string;
  readonly liveRegion?: ((monthName: string, year: string) => string) | string | undefined;
}

/**
 * References to the DOM elements created for the calendar dialog shell.
 */
export interface DialogElements {
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

/**
 * Configuration options for the dialog shell.
 */
export interface DialogShellOptions {
  readonly labels?: PickerLabels | undefined;
  readonly idPrefix?: string | undefined;
  readonly minDate?: PlainDate | undefined;
  readonly maxDate?: PlainDate | undefined;
  readonly calendarEngine?: CalendarEngine | undefined;
  readonly initialDate?: PlainDate | undefined;
  readonly selectedDate?: PlainDate | undefined;
  readonly firstDayOfWeek?: number | undefined;
  readonly locale?: string | undefined;
  readonly dir?: "ltr" | "rtl" | "auto" | undefined;
  readonly isRtl?: boolean | undefined;
  readonly valuePattern?: string | undefined;
  readonly onMonthChange?: ((date: PlainDate) => void) | undefined;
  readonly onToday?: ((todayDate: PlainDate) => void) | undefined;
  readonly onClear?: (() => void) | undefined;
  readonly onOpen?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly onSelect?: ((date: PlainDate) => void) | undefined;
}
