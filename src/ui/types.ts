import type { CalendarEngine, PlainDate } from "../engine/types.js";

/**
 * Localisable labels for the datepicker dialog shell and controls.
 */
export interface PickerLabels {
  readonly chooseDate?: string | undefined;
  readonly previousMonth?: string | undefined;
  readonly nextMonth?: string | undefined;
  readonly monthSelect?: string | undefined;
  readonly yearSelect?: string | undefined;
  readonly today?: string | undefined;
  readonly clear?: string | undefined;
  readonly dialogTitle?: string | undefined;
  readonly months?: readonly string[] | undefined;
}

/**
 * Concrete resolved labels guaranteed to be non-undefined strings.
 */
export interface ResolvedPickerLabels {
  readonly chooseDate: string;
  readonly previousMonth: string;
  readonly nextMonth: string;
  readonly monthSelect: string;
  readonly yearSelect: string;
  readonly today: string;
  readonly clear: string;
  readonly dialogTitle: string;
  readonly months: readonly string[];
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
  readonly onMonthChange?: ((date: PlainDate) => void) | undefined;
  readonly onToday?: ((todayDate: PlainDate) => void) | undefined;
  readonly onClear?: (() => void) | undefined;
  readonly onOpen?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
}
