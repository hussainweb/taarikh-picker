import "./style.css";

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

export interface TaarikhPickerOptions {
  readonly locale?: string | undefined;
}

export class TaarikhPicker {
  public readonly version: string = VERSION;
  private readonly options: TaarikhPickerOptions;

  public constructor(options?: TaarikhPickerOptions) {
    this.options = options ?? {};
  }

  public getOptions(): TaarikhPickerOptions {
    return this.options;
  }

  public destroy(): void {
    // Teardown placeholder
  }
}
