import type { CalendarEngine, PlainDate } from "@taarikh/core";
import {
  addMonths,
  fatimidAstronomicalCalendar,
  formatMonthHeading,
  formatValue,
  formatYear,
  getMonthName,
  isAfter,
  isBefore,
  parseValue,
  today,
} from "@taarikh/core";
import { CALENDAR_SVG_ICON, DEFAULT_LABELS, nextUniqueId } from "./dom.js";
import { MonthGrid } from "./grid.js";
import type { DialogElements, DialogShellOptions, ResolvedPickerLabels } from "./types.js";

/**
 * Accessible calendar dialog shell implementing WAI-ARIA APG Date Picker Dialog.
 *
 * Provides:
 * - Native <dialog> opened with showModal() (top layer, inert background, Esc dismiss).
 * - Sibling trigger button next to the input (does not open on input focus).
 * - CSS Anchor Positioning relative to the input with centered fallback.
 * - Header with previous/next month buttons, month/year selects, and polite live region.
 * - Month grid (<table role="grid">) with roving tabindex and APG keyboard navigation.
 * - Footer with Today and Clear buttons.
 * - Complete, idempotent destroy() method unbinding listeners and removing DOM nodes.
 */
export class DialogShell {
  private readonly input: HTMLInputElement;
  private readonly options: DialogShellOptions;
  private readonly engine: CalendarEngine;
  private readonly labels: ResolvedPickerLabels;
  private readonly abortController: AbortController = new AbortController();
  private readonly elements: DialogElements;
  private readonly grid: MonthGrid;
  private readonly valuePattern: string;
  private visibleDate: PlainDate;
  private selectedDate: PlainDate | undefined;
  private destroyed: boolean = false;
  private previousAnchorName: string = "";
  private isProgrammaticChange: boolean = false;

  public constructor(input: HTMLInputElement, options?: DialogShellOptions) {
    this.input = input;
    this.options = options ?? {};
    this.engine = this.options.calendarEngine ?? fatimidAstronomicalCalendar;
    this.valuePattern = this.options.valuePattern ?? "YYYY-MM-DD";

    const isRtl =
      this.options.isRtl ??
      (this.options.dir === "rtl" ? true : this.options.dir === "ltr" ? false : false);

    this.labels = {
      chooseDate:
        this.options.labels?.chooseDate ??
        this.options.labels?.trigger ??
        this.options.labels?.open ??
        DEFAULT_LABELS.chooseDate,
      previousMonth:
        this.options.labels?.previousMonth ??
        this.options.labels?.prev ??
        DEFAULT_LABELS.previousMonth,
      prev: this.options.labels?.prev ?? (isRtl ? "›" : DEFAULT_LABELS.prev),
      nextMonth:
        this.options.labels?.nextMonth ?? this.options.labels?.next ?? DEFAULT_LABELS.nextMonth,
      next: this.options.labels?.next ?? (isRtl ? "‹" : DEFAULT_LABELS.next),
      monthSelect: this.options.labels?.monthSelect ?? DEFAULT_LABELS.monthSelect,
      yearSelect: this.options.labels?.yearSelect ?? DEFAULT_LABELS.yearSelect,
      today: this.options.labels?.today ?? DEFAULT_LABELS.today,
      clear: this.options.labels?.clear ?? DEFAULT_LABELS.clear,
      close: this.options.labels?.close ?? DEFAULT_LABELS.close,
      dialogTitle: this.options.labels?.dialogTitle ?? DEFAULT_LABELS.dialogTitle,
      months: this.options.labels?.months ?? DEFAULT_LABELS.months,
      weekdays: this.options.labels?.weekdays,
      invalidDate: this.options.labels?.invalidDate ?? DEFAULT_LABELS.invalidDate,
      outOfRange: this.options.labels?.outOfRange ?? DEFAULT_LABELS.outOfRange,
      liveRegion: this.options.labels?.liveRegion,
    };

    // Determine initial date & validity from input.value or options
    const initialRaw = this.input.value.trim();
    if (initialRaw) {
      const parsed = parseValue(initialRaw, this.valuePattern, this.engine, this.labels.months);
      if (parsed) {
        if (this.options.minDate && isBefore(parsed, this.options.minDate)) {
          this.input.setAttribute("aria-invalid", "true");
          this.input.setCustomValidity(this.labels.outOfRange);
          this.visibleDate = this.options.initialDate ?? today(this.engine);
        } else if (this.options.maxDate && isAfter(parsed, this.options.maxDate)) {
          this.input.setAttribute("aria-invalid", "true");
          this.input.setCustomValidity(this.labels.outOfRange);
          this.visibleDate = this.options.initialDate ?? today(this.engine);
        } else {
          this.selectedDate = parsed;
          this.visibleDate = parsed;
        }
      } else {
        this.input.setAttribute("aria-invalid", "true");
        this.input.setCustomValidity(this.labels.invalidDate);
        this.visibleDate = this.options.initialDate ?? today(this.engine);
      }
    } else {
      this.selectedDate = this.options.selectedDate;
      this.visibleDate = this.selectedDate ?? this.options.initialDate ?? today(this.engine);
    }

    const prefix = this.options.idPrefix ?? "tp";
    const uniqueId = nextUniqueId(prefix);
    const dialogId = `${uniqueId}-dialog`;
    const titleId = `${uniqueId}-title`;
    const anchorName = `--tp-anchor-${uniqueId}`;

    // Anchor positioning on the input
    this.previousAnchorName = input.style.getPropertyValue("anchor-name");
    input.style.setProperty("anchor-name", anchorName);

    // Sibling trigger button
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "tp-btn-trigger";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", dialogId);
    trigger.setAttribute("aria-label", this.labels.chooseDate);
    trigger.title = this.labels.chooseDate;
    trigger.innerHTML = `<span class="tp-icon-wrapper" aria-hidden="true">${CALENDAR_SVG_ICON}</span>`;

    // Native <dialog> element
    const dialog = document.createElement("dialog");
    dialog.className = "tp-dialog";
    dialog.id = dialogId;
    dialog.setAttribute("aria-labelledby", titleId);
    dialog.setAttribute("closedby", "any");
    dialog.style.setProperty("position-anchor", anchorName);
    if (isRtl) {
      dialog.setAttribute("dir", "rtl");
    }

    // Dialog title (accessible label for aria-labelledby)
    const title = document.createElement("h2");
    title.id = titleId;
    title.className = "tp-dialog-title tp-visually-hidden";
    title.textContent = this.labels.dialogTitle;
    dialog.appendChild(title);

    // Header container
    const header = document.createElement("header");
    header.className = "tp-dialog-header";

    const nav = document.createElement("div");
    nav.className = "tp-header-nav";

    const btnPrev = document.createElement("button");
    btnPrev.type = "button";
    btnPrev.className = "tp-btn-prev";
    btnPrev.setAttribute("aria-label", this.labels.previousMonth);
    btnPrev.textContent = this.labels.prev;

    const selectors = document.createElement("div");
    selectors.className = "tp-header-selectors";

    const selectMonth = document.createElement("select");
    selectMonth.className = "tp-select-month";
    selectMonth.setAttribute("aria-label", this.labels.monthSelect);

    const selectYear = document.createElement("select");
    selectYear.className = "tp-select-year";
    selectYear.setAttribute("aria-label", this.labels.yearSelect);

    selectors.appendChild(selectMonth);
    selectors.appendChild(selectYear);

    const btnNext = document.createElement("button");
    btnNext.type = "button";
    btnNext.className = "tp-btn-next";
    btnNext.setAttribute("aria-label", this.labels.nextMonth);
    btnNext.textContent = this.labels.next;

    nav.appendChild(btnPrev);
    nav.appendChild(selectors);
    nav.appendChild(btnNext);
    header.appendChild(nav);

    // Polite live region announcing the visible month and year
    const liveRegion = document.createElement("div");
    liveRegion.className = "tp-live-region";
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    header.appendChild(liveRegion);

    dialog.appendChild(header);

    // Grid container
    const gridContainer = document.createElement("div");
    gridContainer.className = "tp-grid-container";
    dialog.appendChild(gridContainer);

    // Month grid with APG keyboard navigation
    this.grid = new MonthGrid({
      calendarEngine: this.engine,
      visibleDate: this.visibleDate,
      selectedDate: this.selectedDate,
      minDate: this.options.minDate,
      maxDate: this.options.maxDate,
      locale: this.options.locale,
      firstDayOfWeek: this.options.firstDayOfWeek,
      isRtl,
      labels: this.labels,
      labelledBy: titleId,
      onSelect: (date) => {
        this.selectDate(date);
      },
      onNavigate: (date) => {
        this.setVisibleDate(date, date.day);
      },
    });
    gridContainer.appendChild(this.grid.getElement());

    // Footer container
    const footer = document.createElement("footer");
    footer.className = "tp-dialog-footer";

    const btnToday = document.createElement("button");
    btnToday.type = "button";
    btnToday.className = "tp-btn-today";
    btnToday.textContent = this.labels.today;

    const btnClear = document.createElement("button");
    btnClear.type = "button";
    btnClear.className = "tp-btn-clear";
    btnClear.textContent = this.labels.clear;

    footer.appendChild(btnToday);
    footer.appendChild(btnClear);
    dialog.appendChild(footer);

    this.elements = {
      trigger,
      dialog,
      title,
      header,
      btnPrev,
      btnNext,
      selectMonth,
      selectYear,
      liveRegion,
      gridContainer,
      grid: this.grid.getElement(),
      footer,
      btnToday,
      btnClear,
    };

    // Insert trigger and dialog next to the input as siblings (not appended to <body>)
    input.after(trigger, dialog);

    // Initialize select options & live region
    this.populateYearOptions();
    this.updateVisibleDisplay();

    // Bind event listeners with AbortSignal for clean teardown
    this.bindEvents();
  }

  public getElements(): DialogElements {
    return this.elements;
  }

  public getGrid(): MonthGrid {
    return this.grid;
  }

  public getVisibleDate(): PlainDate {
    return this.visibleDate;
  }

  public getSelectedDate(): PlainDate | undefined {
    return this.selectedDate;
  }

  public setSelectedDate(date: PlainDate | undefined): void {
    this.selectedDate = date;
    this.grid.setSelectedDate(date);
  }

  public isOpen(): boolean {
    return this.elements.dialog.open;
  }

  public open(): void {
    if (this.destroyed || this.isOpen()) {
      return;
    }
    this.elements.dialog.showModal();
    this.elements.trigger.setAttribute("aria-expanded", "true");
    this.grid.focusActiveDay();
    this.options.onOpen?.();
  }

  public close(): void {
    if (this.destroyed || !this.isOpen()) {
      return;
    }
    this.elements.dialog.close();
    this.elements.trigger.setAttribute("aria-expanded", "false");
    this.elements.trigger.focus();
  }

  public setVisibleDate(date: PlainDate, focusDay?: number): void {
    if (this.destroyed) {
      return;
    }
    this.visibleDate = date;
    this.updateVisibleDisplay();
    this.grid.setVisibleDate(date, focusDay);
    if (this.isOpen() && focusDay !== undefined) {
      this.grid.focusActiveDay();
    }
    this.options.onMonthChange?.(date);
  }

  public getDate(): PlainDate | null {
    if (this.destroyed) {
      return null;
    }
    return this.selectedDate ?? null;
  }

  public setDate(date: PlainDate | null | undefined): void {
    if (this.destroyed) {
      return;
    }
    if (!date) {
      this.clear();
      return;
    }
    this.setVisibleDate(date, date.day);
    this.selectDate(date);
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    if (this.isOpen()) {
      try {
        this.elements.dialog.close();
      } catch {
        // Suppress errors during destroy
      }
    }

    this.grid.destroy();
    this.abortController.abort();
    this.elements.trigger.remove();
    this.elements.dialog.remove();

    if (this.previousAnchorName) {
      this.input.style.setProperty("anchor-name", this.previousAnchorName);
    } else {
      this.input.style.removeProperty("anchor-name");
    }
  }

  public selectDate(date: PlainDate): void {
    if (this.destroyed) {
      return;
    }
    if (this.options.minDate && isBefore(date, this.options.minDate)) {
      return;
    }
    if (this.options.maxDate && isAfter(date, this.options.maxDate)) {
      return;
    }

    this.selectedDate = date;
    this.grid.setSelectedDate(date);

    const formatted = formatValue(date, this.valuePattern, this.labels.months);
    this.input.value = formatted;
    this.input.removeAttribute("aria-invalid");
    this.input.setCustomValidity("");

    this.isProgrammaticChange = true;
    try {
      this.input.dispatchEvent(new Event("input", { bubbles: true }));
      this.input.dispatchEvent(new Event("change", { bubbles: true }));
      this.input.dispatchEvent(
        new CustomEvent("taarikh:change", {
          bubbles: true,
          detail: { date, value: formatted },
        }),
      );
    } finally {
      this.isProgrammaticChange = false;
    }

    this.options.onSelect?.(date);
    this.close();
  }

  public clear(): void {
    if (this.destroyed) {
      return;
    }
    this.selectedDate = undefined;
    this.grid.setSelectedDate(undefined);
    this.input.value = "";
    this.input.removeAttribute("aria-invalid");
    this.input.setCustomValidity("");

    this.isProgrammaticChange = true;
    try {
      this.input.dispatchEvent(new Event("input", { bubbles: true }));
      this.input.dispatchEvent(new Event("change", { bubbles: true }));
      this.input.dispatchEvent(
        new CustomEvent("taarikh:change", {
          bubbles: true,
          detail: { date: null, value: "" },
        }),
      );
    } finally {
      this.isProgrammaticChange = false;
    }

    this.options.onClear?.();
  }

  public handleInputChange(): void {
    if (this.destroyed || this.isProgrammaticChange) {
      return;
    }
    const raw = this.input.value.trim();
    if (!raw) {
      this.selectedDate = undefined;
      this.grid.setSelectedDate(undefined);
      this.input.removeAttribute("aria-invalid");
      this.input.setCustomValidity("");
      this.input.dispatchEvent(
        new CustomEvent("taarikh:change", {
          bubbles: true,
          detail: { date: null, value: "" },
        }),
      );
      return;
    }

    const parsed = parseValue(raw, this.valuePattern, this.engine, this.labels.months);
    if (!parsed) {
      this.input.setAttribute("aria-invalid", "true");
      this.input.setCustomValidity(this.labels.invalidDate);
      return;
    }

    if (this.options.minDate && isBefore(parsed, this.options.minDate)) {
      this.input.setAttribute("aria-invalid", "true");
      this.input.setCustomValidity(this.labels.outOfRange);
      return;
    }

    if (this.options.maxDate && isAfter(parsed, this.options.maxDate)) {
      this.input.setAttribute("aria-invalid", "true");
      this.input.setCustomValidity(this.labels.outOfRange);
      return;
    }

    // Valid and within range
    this.input.removeAttribute("aria-invalid");
    this.input.setCustomValidity("");
    this.setSelectedDate(parsed);
    this.setVisibleDate(parsed, parsed.day);
    this.input.dispatchEvent(
      new CustomEvent("taarikh:change", {
        bubbles: true,
        detail: { date: parsed, value: this.input.value },
      }),
    );
  }

  public [Symbol.dispose](): void {
    this.destroy();
  }

  private bindEvents(): void {
    const signal = this.abortController.signal;
    const { trigger, dialog, btnPrev, btnNext, selectMonth, selectYear, btnToday, btnClear } =
      this.elements;

    // Trigger toggle
    trigger.addEventListener(
      "click",
      () => {
        if (this.isOpen()) {
          this.close();
        } else {
          this.open();
        }
      },
      { signal },
    );

    // Backdrop click dismiss
    dialog.addEventListener(
      "click",
      (e: MouseEvent) => {
        if (e.target === dialog) {
          const rect = dialog.getBoundingClientRect();
          const isInside =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom;
          if (!isInside) {
            this.close();
          }
        }
      },
      { signal },
    );

    // Native Esc or dialog close
    dialog.addEventListener(
      "close",
      () => {
        trigger.setAttribute("aria-expanded", "false");
        this.options.onClose?.();
      },
      { signal },
    );

    // Input change event for typed input
    this.input.addEventListener(
      "change",
      () => {
        this.handleInputChange();
      },
      { signal },
    );

    // Month select change
    selectMonth.addEventListener(
      "change",
      () => {
        const month = parseInt(selectMonth.value, 10);
        if (!Number.isNaN(month)) {
          const year = this.visibleDate.year;
          let day = this.visibleDate.day;
          const maxDays = this.engine.daysInMonth(year, month);
          let minDay = 1;
          let maxDay = maxDays;
          if (
            this.options.minDate &&
            year === this.options.minDate.year &&
            month === this.options.minDate.month
          ) {
            minDay = this.options.minDate.day;
          }
          if (
            this.options.maxDate &&
            year === this.options.maxDate.year &&
            month === this.options.maxDate.month
          ) {
            maxDay = this.options.maxDate.day;
          }
          day = Math.max(minDay, Math.min(day, maxDay));
          this.setVisibleDate({ year, month, day }, day);
        }
      },
      { signal },
    );

    // Year select change
    selectYear.addEventListener(
      "change",
      () => {
        const year = parseInt(selectYear.value, 10);
        if (!Number.isNaN(year)) {
          let month = this.visibleDate.month;
          const monthsCount = this.engine.monthsInYear(year);
          let minMonth = 1;
          let maxMonth = monthsCount;
          if (this.options.minDate && year === this.options.minDate.year) {
            minMonth = this.options.minDate.month;
          }
          if (this.options.maxDate && year === this.options.maxDate.year) {
            maxMonth = this.options.maxDate.month;
          }
          month = Math.max(minMonth, Math.min(month, maxMonth));

          let day = this.visibleDate.day;
          const maxDays = this.engine.daysInMonth(year, month);
          let minDay = 1;
          let maxDay = maxDays;
          if (
            this.options.minDate &&
            year === this.options.minDate.year &&
            month === this.options.minDate.month
          ) {
            minDay = this.options.minDate.day;
          }
          if (
            this.options.maxDate &&
            year === this.options.maxDate.year &&
            month === this.options.maxDate.month
          ) {
            maxDay = this.options.maxDate.day;
          }
          day = Math.max(minDay, Math.min(day, maxDay));
          this.setVisibleDate({ year, month, day }, day);
        }
      },
      { signal },
    );

    // Previous month button
    btnPrev.addEventListener(
      "click",
      () => {
        const prev = addMonths(this.visibleDate, -1, this.engine);
        this.setVisibleDate(prev);
      },
      { signal },
    );

    // Next month button
    btnNext.addEventListener(
      "click",
      () => {
        const next = addMonths(this.visibleDate, 1, this.engine);
        this.setVisibleDate(next);
      },
      { signal },
    );

    // Today button
    btnToday.addEventListener(
      "click",
      () => {
        const todayDate = today(this.engine);
        this.setVisibleDate(todayDate, todayDate.day);
        this.selectDate(todayDate);
        this.options.onToday?.(todayDate);
      },
      { signal },
    );

    // Clear button
    btnClear.addEventListener(
      "click",
      () => {
        this.clear();
      },
      { signal },
    );
  }

  private populateYearOptions(): void {
    const { selectYear } = this.elements;
    selectYear.innerHTML = "";

    let minYear = this.options.minDate?.year ?? Math.min(this.visibleDate.year - 50, 1300);
    let maxYear = this.options.maxDate?.year ?? Math.max(this.visibleDate.year + 50, 1500);

    if (this.visibleDate.year < minYear) {
      minYear = this.options.minDate ? this.options.minDate.year : this.visibleDate.year;
    }
    if (this.visibleDate.year > maxYear) {
      maxYear = this.options.maxDate ? this.options.maxDate.year : this.visibleDate.year;
    }

    for (let y = minYear; y <= maxYear; y += 1) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = formatYear(y, this.options.locale);
      selectYear.appendChild(opt);
    }
  }

  private updateVisibleDisplay(): void {
    const { selectMonth, selectYear, liveRegion, btnPrev, btnNext } = this.elements;
    const year = this.visibleDate.year;
    const month = this.visibleDate.month;

    // Check if selectYear has an option for year; if not, regenerate options
    if (!selectYear.querySelector(`option[value="${year}"]`)) {
      this.populateYearOptions();
    }

    // Update month select options bounded by minDate/maxDate for current year
    const monthsCount = this.engine.monthsInYear(year);
    let minMonth = 1;
    let maxMonth = monthsCount;
    if (this.options.minDate && year === this.options.minDate.year) {
      minMonth = this.options.minDate.month;
    }
    if (this.options.maxDate && year === this.options.maxDate.year) {
      maxMonth = this.options.maxDate.month;
    }

    selectMonth.innerHTML = "";
    for (let m = minMonth; m <= maxMonth; m += 1) {
      const opt = document.createElement("option");
      opt.value = String(m);
      opt.textContent = this.getMonthName(m);
      selectMonth.appendChild(opt);
    }
    selectMonth.value = String(month);
    selectYear.value = String(year);

    // Announce visible month & year via polite live region
    const monthName = this.getMonthName(month);
    const yearDisplay = formatYear(year, this.options.locale);

    if (typeof this.labels.liveRegion === "function") {
      liveRegion.textContent = this.labels.liveRegion(monthName, yearDisplay);
    } else if (typeof this.labels.liveRegion === "string") {
      liveRegion.textContent = this.labels.liveRegion
        .replace("{month}", monthName)
        .replace("{year}", yearDisplay);
    } else {
      liveRegion.textContent = formatMonthHeading(this.visibleDate, this.engine, {
        locale: this.options.locale,
        labels: this.labels.months,
      });
    }

    // Update bounded navigation buttons
    if (this.options.minDate) {
      const isAtOrBeforeMin =
        year < this.options.minDate.year ||
        (year === this.options.minDate.year && month <= this.options.minDate.month);
      btnPrev.disabled = isAtOrBeforeMin;
      if (isAtOrBeforeMin) {
        btnPrev.setAttribute("aria-disabled", "true");
      } else {
        btnPrev.removeAttribute("aria-disabled");
      }
    } else {
      btnPrev.disabled = false;
      btnPrev.removeAttribute("aria-disabled");
    }

    if (this.options.maxDate) {
      const isAtOrAfterMax =
        year > this.options.maxDate.year ||
        (year === this.options.maxDate.year && month >= this.options.maxDate.month);
      btnNext.disabled = isAtOrAfterMax;
      if (isAtOrAfterMax) {
        btnNext.setAttribute("aria-disabled", "true");
      } else {
        btnNext.removeAttribute("aria-disabled");
      }
    } else {
      btnNext.disabled = false;
      btnNext.removeAttribute("aria-disabled");
    }

    // Update Today button bounded state
    const todayDate = today(this.engine);
    const isTodayOutOfRange =
      (this.options.minDate && isBefore(todayDate, this.options.minDate)) ||
      (this.options.maxDate && isAfter(todayDate, this.options.maxDate));
    this.elements.btnToday.disabled = Boolean(isTodayOutOfRange);
    if (isTodayOutOfRange) {
      this.elements.btnToday.setAttribute("aria-disabled", "true");
    } else {
      this.elements.btnToday.removeAttribute("aria-disabled");
    }
  }

  private getMonthName(monthNumber: number): string {
    const name = getMonthName(monthNumber, "long", this.labels.months);
    return name || `Month ${monthNumber}`;
  }
}
