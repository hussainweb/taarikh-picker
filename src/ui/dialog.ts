import type { CalendarEngine, PlainDate } from "../engine/types.js";
import { addMonths, today } from "../engine/helpers.js";
import { createDefaultCalendarEngine } from "./default-engine.js";
import { CALENDAR_SVG_ICON, DEFAULT_LABELS, nextUniqueId } from "./dom.js";
import type { DialogElements, DialogShellOptions, ResolvedPickerLabels } from "./types.js";

/**
 * Accessible calendar dialog shell implementing WAI-ARIA APG Date Picker Dialog.
 *
 * Provides:
 * - Native <dialog> opened with showModal() (top layer, inert background, Esc dismiss).
 * - Sibling trigger button next to the input (does not open on input focus).
 * - CSS Anchor Positioning relative to the input with centered fallback.
 * - Header with previous/next month buttons, month/year selects, and polite live region.
 * - Footer with Today and Clear buttons.
 * - Grid container placeholder for month table keyboard navigation.
 * - Complete, idempotent destroy() method unbinding listeners and removing DOM nodes.
 */
export class DialogShell {
  private readonly input: HTMLInputElement;
  private readonly options: DialogShellOptions;
  private readonly engine: CalendarEngine;
  private readonly labels: ResolvedPickerLabels;
  private readonly abortController: AbortController = new AbortController();
  private readonly elements: DialogElements;
  private visibleDate: PlainDate;
  private destroyed: boolean = false;
  private previousAnchorName: string = "";

  public constructor(input: HTMLInputElement, options?: DialogShellOptions) {
    this.input = input;
    this.options = options ?? {};
    this.engine = this.options.calendarEngine ?? createDefaultCalendarEngine();

    this.labels = {
      chooseDate: this.options.labels?.chooseDate ?? DEFAULT_LABELS.chooseDate,
      previousMonth: this.options.labels?.previousMonth ?? DEFAULT_LABELS.previousMonth,
      nextMonth: this.options.labels?.nextMonth ?? DEFAULT_LABELS.nextMonth,
      monthSelect: this.options.labels?.monthSelect ?? DEFAULT_LABELS.monthSelect,
      yearSelect: this.options.labels?.yearSelect ?? DEFAULT_LABELS.yearSelect,
      today: this.options.labels?.today ?? DEFAULT_LABELS.today,
      clear: this.options.labels?.clear ?? DEFAULT_LABELS.clear,
      dialogTitle: this.options.labels?.dialogTitle ?? DEFAULT_LABELS.dialogTitle,
      months: this.options.labels?.months ?? DEFAULT_LABELS.months,
    };

    this.visibleDate = this.options.initialDate ?? today(this.engine);

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
    btnPrev.textContent = "‹";

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
    btnNext.textContent = "›";

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

    // Grid container placeholder (to be populated by tp-il8.3.2)
    const gridContainer = document.createElement("div");
    gridContainer.className = "tp-grid-container";
    dialog.appendChild(gridContainer);

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

  public getVisibleDate(): PlainDate {
    return this.visibleDate;
  }

  public isOpen(): boolean {
    return this.elements.dialog.open || this.elements.dialog.hasAttribute("open");
  }

  public open(): void {
    if (this.destroyed || this.isOpen()) {
      return;
    }
    if (typeof this.elements.dialog.showModal === "function") {
      this.elements.dialog.showModal();
    } else {
      this.elements.dialog.setAttribute("open", "");
    }
    this.elements.trigger.setAttribute("aria-expanded", "true");
    this.options.onOpen?.();
  }

  public close(): void {
    if (this.destroyed || !this.isOpen()) {
      return;
    }
    if (typeof this.elements.dialog.close === "function") {
      this.elements.dialog.close();
    } else {
      this.elements.dialog.removeAttribute("open");
      this.elements.dialog.dispatchEvent(new Event("close"));
    }
    this.elements.trigger.setAttribute("aria-expanded", "false");
    try {
      this.elements.trigger.focus();
    } catch {
      // Safe in non-browser or detached test environments
    }
  }

  public setVisibleDate(date: PlainDate): void {
    if (this.destroyed) {
      return;
    }
    this.visibleDate = date;
    this.updateVisibleDisplay();
    this.options.onMonthChange?.(date);
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    if (this.isOpen()) {
      try {
        this.close();
      } catch {
        // Suppress errors during destroy
      }
    }

    this.abortController.abort();
    this.elements.trigger.remove();
    this.elements.dialog.remove();

    if (this.previousAnchorName) {
      this.input.style.setProperty("anchor-name", this.previousAnchorName);
    } else {
      this.input.style.removeProperty("anchor-name");
    }
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
          if (typeof dialog.getBoundingClientRect === "function") {
            const rect = dialog.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const isInside =
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom;
              if (!isInside) {
                this.close();
              }
              return;
            }
          }
          this.close();
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

    // Month select change
    selectMonth.addEventListener(
      "change",
      () => {
        const month = parseInt(selectMonth.value, 10);
        if (!Number.isNaN(month)) {
          const maxDays = this.engine.daysInMonth(this.visibleDate.year, month);
          const day = Math.min(this.visibleDate.day, maxDays);
          this.setVisibleDate({ year: this.visibleDate.year, month, day });
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
          const maxMonths = this.engine.monthsInYear(year);
          const month = Math.min(this.visibleDate.month, maxMonths);
          const maxDays = this.engine.daysInMonth(year, month);
          const day = Math.min(this.visibleDate.day, maxDays);
          this.setVisibleDate({ year, month, day });
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
        this.setVisibleDate(todayDate);
        this.options.onToday?.(todayDate);
      },
      { signal },
    );

    // Clear button
    btnClear.addEventListener(
      "click",
      () => {
        this.input.value = "";
        this.options.onClear?.();
      },
      { signal },
    );
  }

  private populateYearOptions(): void {
    const { selectYear } = this.elements;
    selectYear.innerHTML = "";

    const minYear = this.options.minDate?.year ?? Math.min(this.visibleDate.year - 50, 1300);
    const maxYear = this.options.maxDate?.year ?? Math.max(this.visibleDate.year + 50, 1500);

    for (let y = minYear; y <= maxYear; y += 1) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      selectYear.appendChild(opt);
    }
  }

  private updateVisibleDisplay(): void {
    const { selectMonth, selectYear, liveRegion, btnPrev, btnNext } = this.elements;
    const year = this.visibleDate.year;
    const month = this.visibleDate.month;

    // Update month select options for current year
    const monthsCount = this.engine.monthsInYear(year);
    selectMonth.innerHTML = "";
    for (let m = 1; m <= monthsCount; m += 1) {
      const opt = document.createElement("option");
      opt.value = String(m);
      opt.textContent = this.getMonthName(m);
      selectMonth.appendChild(opt);
    }
    selectMonth.value = String(month);
    selectYear.value = String(year);

    // Announce visible month & year via polite live region
    const monthName = this.getMonthName(month);
    liveRegion.textContent = `${monthName} ${year}`;

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
  }

  private getMonthName(monthNumber: number): string {
    const months = this.labels.months;
    const name = months[monthNumber - 1];
    return name ?? `Month ${monthNumber}`;
  }
}
