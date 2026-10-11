import "./style.css";

import type { CalendarEngine, PlainDate } from "./engine/index.js";
import { DialogShell } from "./ui/dialog.js";
import type { DialogElements, PickerLabels } from "./ui/types.js";

export const VERSION: string = "0.1.0";

export type { CalendarEngine, MonthLabels, PlainDate } from "./engine/index.js";
export {
  DEFAULT_MONTH_LABELS,
  FATIMID_MONTH_NAMES,
  FATIMID_MONTH_NAMES_SHORT,
  FatimidAstronomicalCalendar,
  addDays,
  addMonths,
  addYears,
  compareDates,
  fatimidAstronomical,
  fatimidAstronomicalCalendar,
  getMonthName,
  gregorianToJulianDay,
  isAfter,
  isBefore,
  isSameDay,
  today,
  weekday,
  weekdayFromJdn,
} from "./engine/index.js";

export type { DisplayOptions } from "./format/index.js";
export {
  formatDayAriaLabel,
  formatDisplay,
  formatMonthHeading,
  formatValue,
  getWeekdayNames,
  parseValue,
} from "./format/index.js";

export type { DialogElements, DialogShellOptions, PickerLabels } from "./ui/types.js";
export { DialogShell } from "./ui/dialog.js";
export { DEFAULT_LABELS } from "./ui/dom.js";

/**
 * Options for configuring TaarikhPicker.
 */
export interface TaarikhPickerOptions {
  readonly locale?: string | undefined;
  readonly labels?: PickerLabels | undefined;
  readonly minDate?: PlainDate | undefined;
  readonly maxDate?: PlainDate | undefined;
  readonly engine?: CalendarEngine | undefined;
  readonly initialDate?: PlainDate | undefined;
  readonly idPrefix?: string | undefined;
  readonly onMonthChange?: ((date: PlainDate) => void) | undefined;
  readonly onToday?: ((todayDate: PlainDate) => void) | undefined;
  readonly onClear?: (() => void) | undefined;
  readonly onOpen?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
}

/**
 * Accessible datepicker for Hijri calendars.
 */
export class TaarikhPicker {
  public readonly version: string = VERSION;
  private readonly options: TaarikhPickerOptions;
  private readonly input: HTMLInputElement | undefined;
  private dialogShell: DialogShell | undefined;

  public constructor(
    inputOrOptions?: HTMLInputElement | TaarikhPickerOptions,
    options?: TaarikhPickerOptions,
  ) {
    if (
      typeof inputOrOptions === "object" &&
      inputOrOptions !== null &&
      "nodeType" in inputOrOptions &&
      (inputOrOptions as Node).nodeType === 1
    ) {
      this.input = inputOrOptions as HTMLInputElement;
      this.options = options ?? {};
      this.dialogShell = new DialogShell(this.input, {
        labels: this.options.labels,
        minDate: this.options.minDate,
        maxDate: this.options.maxDate,
        calendarEngine: this.options.engine,
        initialDate: this.options.initialDate,
        idPrefix: this.options.idPrefix,
        onMonthChange: this.options.onMonthChange,
        onToday: this.options.onToday,
        onClear: this.options.onClear,
        onOpen: this.options.onOpen,
        onClose: this.options.onClose,
      });
    } else {
      this.input = undefined;
      this.options = (inputOrOptions as TaarikhPickerOptions) ?? {};
      this.dialogShell = undefined;
    }
  }

  public getOptions(): TaarikhPickerOptions {
    return this.options;
  }

  public getInput(): HTMLInputElement | undefined {
    return this.input;
  }

  public getDialogShell(): DialogShell | undefined {
    return this.dialogShell;
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
