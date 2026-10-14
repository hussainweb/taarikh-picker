import type { CalendarEngine, PlainDate } from "../engine/types.js";
import {
  addDays,
  addMonths,
  addYears,
  compareDates,
  isSameDay,
  today,
  weekday,
} from "../engine/helpers.js";
import { formatDayAriaLabel, getWeekdayNames } from "../format/display.js";
import { formatValue } from "../format/value.js";
import type { PickerLabels } from "./types.js";

/**
 * Options for configuring MonthGrid.
 */
export interface MonthGridOptions {
  readonly calendarEngine: CalendarEngine;
  readonly visibleDate: PlainDate;
  readonly selectedDate?: PlainDate | undefined;
  readonly minDate?: PlainDate | undefined;
  readonly maxDate?: PlainDate | undefined;
  readonly locale?: string | undefined;
  readonly firstDayOfWeek?: number | undefined;
  readonly isRtl?: boolean | undefined;
  readonly labels?: PickerLabels | undefined;
  readonly labelledBy?: string | undefined;
  readonly onSelect?: ((date: PlainDate) => void) | undefined;
  readonly onNavigate?: ((date: PlainDate) => void) | undefined;
}

/**
 * Accessible month grid implementing the WAI-ARIA APG Date Picker Dialog grid pattern.
 *
 * Provides:
 * - <table role="grid"> with 7 column headers (short weekday, full name in abbr).
 * - Roving tabindex: exactly one focusable day button (tabindex="0"); all others tabindex="-1".
 * - Full APG keyboard navigation:
 *   - ArrowLeft / ArrowRight: previous / next day (mirrored in RTL).
 *   - ArrowUp / ArrowDown: previous / next week (-7 / +7 days).
 *   - Home / End: start / end of current week.
 *   - PageUp / PageDown: previous / next month.
 *   - Shift+PageUp / Shift+PageDown: previous / next year.
 *   - Enter / Space: select focused date and trigger onSelect.
 * - ARIA states:
 *   - aria-selected="true" on selected date, "false" on others.
 *   - aria-current="date" on today.
 *   - aria-disabled="true" on dates outside minDate / maxDate.
 * - Each day button's accessible name is the full date via formatDayAriaLabel.
 */
export class MonthGrid {
  private readonly options: MonthGridOptions;
  private readonly engine: CalendarEngine;
  private readonly table: HTMLTableElement;
  private readonly thead: HTMLTableSectionElement;
  private readonly tbody: HTMLTableSectionElement;
  private readonly abortController: AbortController = new AbortController();
  private readonly dayButtons: Map<number, HTMLButtonElement> = new Map();

  private visibleDate: PlainDate;
  private selectedDate: PlainDate | undefined;
  private focusedDate: PlainDate;
  private minDate: PlainDate | undefined;
  private maxDate: PlainDate | undefined;
  private readonly firstDayOfWeek: number;
  private readonly isRtl: boolean;

  public constructor(options: MonthGridOptions) {
    this.options = options;
    this.engine = options.calendarEngine;
    this.visibleDate = options.visibleDate;
    this.selectedDate = options.selectedDate;
    this.minDate = options.minDate;
    this.maxDate = options.maxDate;
    this.firstDayOfWeek = (options.firstDayOfWeek ?? 0) % 7;
    this.isRtl = Boolean(options.isRtl);

    this.focusedDate = this.computeInitialFocusedDate(this.visibleDate);

    // Create table elements
    this.table = document.createElement("table");
    this.table.className = "tp-grid-table";
    this.table.setAttribute("role", "grid");
    if (options.labelledBy) {
      this.table.setAttribute("aria-labelledby", options.labelledBy);
    }

    this.thead = document.createElement("thead");
    this.thead.className = "tp-grid-head";
    this.table.appendChild(this.thead);

    this.tbody = document.createElement("tbody");
    this.tbody.className = "tp-grid-body";
    this.tbody.setAttribute("role", "rowgroup");
    this.table.appendChild(this.tbody);

    this.renderHeaders();
    this.renderBody();
    this.bindEvents();
  }

  public getElement(): HTMLTableElement {
    return this.table;
  }

  public getVisibleDate(): PlainDate {
    return this.visibleDate;
  }

  public getFocusedDate(): PlainDate {
    return this.focusedDate;
  }

  public getSelectedDate(): PlainDate | undefined {
    return this.selectedDate;
  }

  public setSelectedDate(date: PlainDate | undefined): void {
    this.selectedDate = date;
    this.updateSelectedState();
  }

  public setMinDate(minDate: PlainDate | undefined): void {
    this.minDate = minDate;
    this.renderBody();
  }

  public setMaxDate(maxDate: PlainDate | undefined): void {
    this.maxDate = maxDate;
    this.renderBody();
  }

  public setVisibleDate(date: PlainDate, focusDay?: number): void {
    this.visibleDate = date;
    const daysInMonth = this.engine.daysInMonth(date.year, date.month);
    const day = focusDay !== undefined ? Math.max(1, Math.min(focusDay, daysInMonth)) : undefined;

    if (day !== undefined) {
      this.focusedDate = { year: date.year, month: date.month, day };
    } else {
      this.focusedDate = this.computeInitialFocusedDate(date);
    }

    this.renderBody();
  }

  public focusActiveDay(): void {
    const btn = this.dayButtons.get(this.focusedDate.day);
    if (btn) {
      btn.focus();
    }
  }

  public isDateDisabled(date: PlainDate): boolean {
    if (this.minDate && compareDates(date, this.minDate) < 0) {
      return true;
    }
    if (this.maxDate && compareDates(date, this.maxDate) > 0) {
      return true;
    }
    return false;
  }

  public destroy(): void {
    this.abortController.abort();
    this.dayButtons.clear();
    this.table.remove();
  }

  private computeInitialFocusedDate(monthDate: PlainDate): PlainDate {
    const daysInMonth = this.engine.daysInMonth(monthDate.year, monthDate.month);

    // If selectedDate is in this month, focus it
    if (
      this.selectedDate &&
      this.selectedDate.year === monthDate.year &&
      this.selectedDate.month === monthDate.month
    ) {
      const day = Math.max(1, Math.min(this.selectedDate.day, daysInMonth));
      return { year: monthDate.year, month: monthDate.month, day };
    }

    // If today is in this month, focus today
    const todayDate = today(this.engine);
    if (todayDate.year === monthDate.year && todayDate.month === monthDate.month) {
      const day = Math.max(1, Math.min(todayDate.day, daysInMonth));
      return { year: monthDate.year, month: monthDate.month, day };
    }

    // Otherwise, focus the 1st of the month (or clamp visibleDate.day)
    const day = Math.max(1, Math.min(monthDate.day || 1, daysInMonth));
    return { year: monthDate.year, month: monthDate.month, day };
  }

  private renderHeaders(): void {
    this.thead.replaceChildren();

    const row = document.createElement("tr");
    row.className = "tp-grid-head-row";
    row.setAttribute("role", "row");

    const shortNames = getWeekdayNames(
      this.options.locale,
      "short",
      this.firstDayOfWeek,
      this.options.labels?.weekdays,
    );
    const longNames = getWeekdayNames(
      this.options.locale,
      "long",
      this.firstDayOfWeek,
      this.options.labels?.weekdays,
    );

    for (let i = 0; i < 7; i++) {
      const th = document.createElement("th");
      th.className = "tp-grid-head-cell";
      th.setAttribute("role", "columnheader");
      th.setAttribute("scope", "col");
      th.setAttribute("abbr", longNames[i] ?? shortNames[i] ?? "");

      const span = document.createElement("span");
      span.textContent = shortNames[i] ?? "";
      th.appendChild(span);
      row.appendChild(th);
    }

    this.thead.appendChild(row);
  }

  private renderBody(): void {
    this.tbody.replaceChildren();
    this.dayButtons.clear();

    const year = this.visibleDate.year;
    const month = this.visibleDate.month;
    const daysInMonth = this.engine.daysInMonth(year, month);
    const todayDate = today(this.engine);

    // Day of the week for day 1
    const firstDayWeekday = weekday({ year, month, day: 1 }, this.engine);
    const leadingEmptyCells = (((firstDayWeekday - this.firstDayOfWeek) % 7) + 7) % 7;

    let currentRow = document.createElement("tr");
    currentRow.className = "tp-grid-row";
    currentRow.setAttribute("role", "row");

    // Leading empty cells
    for (let i = 0; i < leadingEmptyCells; i++) {
      const td = document.createElement("td");
      td.className = "tp-grid-cell tp-grid-cell-empty";
      td.setAttribute("role", "gridcell");
      currentRow.appendChild(td);
    }

    let colCount = leadingEmptyCells;

    for (let day = 1; day <= daysInMonth; day++) {
      if (colCount === 7) {
        this.tbody.appendChild(currentRow);
        currentRow = document.createElement("tr");
        currentRow.className = "tp-grid-row";
        currentRow.setAttribute("role", "row");
        colCount = 0;
      }

      const date: PlainDate = { year, month, day };
      const td = document.createElement("td");
      td.className = "tp-grid-cell";
      td.setAttribute("role", "gridcell");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tp-day-btn";
      btn.textContent = String(day);
      btn.dataset.date = formatValue(date);

      // Accessible name
      const ariaLabel = formatDayAriaLabel(
        date,
        this.engine,
        this.options.locale,
        this.options.labels?.months,
        this.options.labels?.weekdays,
      );
      btn.setAttribute("aria-label", ariaLabel);

      // Selected state on the gridcell (WAI-ARIA: aria-selected belongs on gridcell, not button)
      const isSelected = this.selectedDate !== undefined && isSameDay(date, this.selectedDate);
      td.setAttribute("aria-selected", isSelected ? "true" : "false");
      btn.dataset.selected = isSelected ? "true" : "false";

      // Today state
      if (isSameDay(date, todayDate)) {
        btn.setAttribute("aria-current", "date");
      }

      // Disabled state
      if (this.isDateDisabled(date)) {
        btn.setAttribute("aria-disabled", "true");
        btn.classList.add("tp-day-disabled");
      }

      // Roving tabindex: exactly one button has tabindex="0"
      if (day === this.focusedDate.day) {
        btn.tabIndex = 0;
      } else {
        btn.tabIndex = -1;
      }

      this.dayButtons.set(day, btn);
      td.appendChild(btn);
      currentRow.appendChild(td);
      colCount++;
    }

    // Trailing empty cells to complete the 7-column row
    if (colCount > 0) {
      while (colCount < 7) {
        const td = document.createElement("td");
        td.className = "tp-grid-cell tp-grid-cell-empty";
        td.setAttribute("role", "gridcell");
        currentRow.appendChild(td);
        colCount++;
      }
      this.tbody.appendChild(currentRow);
    }
  }

  private updateSelectedState(): void {
    for (const [day, btn] of this.dayButtons.entries()) {
      const date: PlainDate = {
        year: this.visibleDate.year,
        month: this.visibleDate.month,
        day,
      };
      const isSelected = this.selectedDate !== undefined && isSameDay(date, this.selectedDate);
      btn.dataset.selected = isSelected ? "true" : "false";
      const cell = btn.parentElement;
      if (cell) {
        cell.setAttribute("aria-selected", isSelected ? "true" : "false");
      }
    }
  }

  private updateFocusedDay(newDay: number): void {
    const daysInMonth = this.engine.daysInMonth(this.visibleDate.year, this.visibleDate.month);
    const clampedDay = Math.max(1, Math.min(newDay, daysInMonth));

    const oldBtn = this.dayButtons.get(this.focusedDate.day);
    if (oldBtn) {
      oldBtn.tabIndex = -1;
    }

    this.focusedDate = {
      year: this.visibleDate.year,
      month: this.visibleDate.month,
      day: clampedDay,
    };

    const newBtn = this.dayButtons.get(clampedDay);
    if (newBtn) {
      newBtn.tabIndex = 0;
      newBtn.focus();
    }
  }

  private selectDate(date: PlainDate): void {
    if (this.isDateDisabled(date)) {
      return;
    }
    this.selectedDate = date;
    this.updateSelectedState();
    this.options.onSelect?.(date);
  }

  private bindEvents(): void {
    const signal = this.abortController.signal;

    // Click handler for day buttons
    this.tbody.addEventListener(
      "click",
      (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        const btn = target?.closest(".tp-day-btn") as HTMLButtonElement | null;
        if (!btn) {
          return;
        }

        const dateStr = btn.dataset.date;
        if (!dateStr) {
          return;
        }

        const dayNum = parseInt(btn.textContent ?? "", 10);
        if (Number.isNaN(dayNum)) {
          return;
        }

        const date: PlainDate = {
          year: this.visibleDate.year,
          month: this.visibleDate.month,
          day: dayNum,
        };

        this.updateFocusedDay(dayNum);
        this.selectDate(date);
      },
      { signal },
    );

    // Keyboard navigation per WAI-ARIA APG Date Picker Dialog
    this.table.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        let handled = false;
        let targetDate: PlainDate | null = null;

        switch (e.key) {
          case "ArrowLeft": {
            // In RTL, ArrowLeft moves forward (+1 day)
            const delta = this.isRtl ? 1 : -1;
            targetDate = addDays(this.focusedDate, delta, this.engine);
            handled = true;
            break;
          }

          case "ArrowRight": {
            // In RTL, ArrowRight moves backward (-1 day)
            const delta = this.isRtl ? -1 : 1;
            targetDate = addDays(this.focusedDate, delta, this.engine);
            handled = true;
            break;
          }

          case "ArrowUp": {
            targetDate = addDays(this.focusedDate, -7, this.engine);
            handled = true;
            break;
          }

          case "ArrowDown": {
            targetDate = addDays(this.focusedDate, 7, this.engine);
            handled = true;
            break;
          }

          case "Home": {
            // First day of the week
            const w = weekday(this.focusedDate, this.engine);
            const col = (w - this.firstDayOfWeek + 7) % 7;
            targetDate = addDays(this.focusedDate, -col, this.engine);
            handled = true;
            break;
          }

          case "End": {
            // Last day of the week
            const w = weekday(this.focusedDate, this.engine);
            const col = (w - this.firstDayOfWeek + 7) % 7;
            targetDate = addDays(this.focusedDate, 6 - col, this.engine);
            handled = true;
            break;
          }

          case "PageUp": {
            if (e.shiftKey) {
              // Shift + PageUp: previous year
              targetDate = addYears(this.focusedDate, -1, this.engine);
            } else {
              // PageUp: previous month
              targetDate = addMonths(this.focusedDate, -1, this.engine);
            }
            handled = true;
            break;
          }

          case "PageDown": {
            if (e.shiftKey) {
              // Shift + PageDown: next year
              targetDate = addYears(this.focusedDate, 1, this.engine);
            } else {
              // PageDown: next month
              targetDate = addMonths(this.focusedDate, 1, this.engine);
            }
            handled = true;
            break;
          }

          case "Enter":
          case " ": {
            handled = true;
            this.selectDate(this.focusedDate);
            break;
          }

          default:
            break;
        }

        if (handled) {
          e.preventDefault();
        }

        if (targetDate) {
          if (
            targetDate.year === this.visibleDate.year &&
            targetDate.month === this.visibleDate.month
          ) {
            // Stay within same month: move roving tabindex
            this.updateFocusedDay(targetDate.day);
          } else {
            // Cross-month navigation
            this.focusedDate = targetDate;
            this.options.onNavigate?.(targetDate);
          }
        }
      },
      { signal },
    );
  }
}
