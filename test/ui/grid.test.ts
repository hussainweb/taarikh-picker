import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../src/style.css";
import { fatimidAstronomicalCalendar } from "../../src/engine/index.js";
import type { PlainDate } from "../../src/engine/index.js";
import { MonthGrid } from "../../src/ui/grid.js";
import { DialogShell } from "../../src/ui/dialog.js";

describe("MonthGrid - WAI-ARIA APG Date Picker Grid & WCAG 2.2 AA", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
  });

  it("renders <table role='grid'> with 7 column headers having visible short name and full abbr", () => {
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 15 },
    });
    container.appendChild(grid.getElement());

    const table = grid.getElement();
    expect(table.tagName).toBe("TABLE");
    expect(table.getAttribute("role")).toBe("grid");

    const headers = table.querySelectorAll("th[role='columnheader']");
    expect(headers.length).toBe(7);

    // Default firstDayOfWeek is 0 (Sunday)
    expect(headers[0]?.getAttribute("abbr")).toBe("Sunday");
    expect(headers[0]?.textContent?.trim()).toBe("Sun");
    expect(headers[6]?.getAttribute("abbr")).toBe("Saturday");
    expect(headers[6]?.textContent?.trim()).toBe("Sat");
  });

  it("lays out days in rows of 7 with correct leading empty cells and roving tabindex", () => {
    // 1 Moharram 1448: check weekday
    // 1 Moharram 1 AH was Thursday. In 1448 AH:
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 10 },
      selectedDate: { year: 1448, month: 1, day: 10 },
    });
    container.appendChild(grid.getElement());

    const table = grid.getElement();
    const rows = table.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThanOrEqual(4);

    // All rows have exactly 7 cells
    for (const row of rows) {
      expect(row.children.length).toBe(7);
    }

    // Day buttons count equals daysInMonth (Moharram = 30 days)
    const dayButtons = table.querySelectorAll(".tp-day-btn");
    expect(dayButtons.length).toBe(30);

    // Roving tabindex: exactly one button has tabindex="0", rest have tabindex="-1"
    const tabIndexZeros = table.querySelectorAll(".tp-day-btn[tabindex='0']");
    expect(tabIndexZeros.length).toBe(1);
    expect(tabIndexZeros[0]?.textContent).toBe("10");

    const tabIndexMinusOnes = table.querySelectorAll(".tp-day-btn[tabindex='-1']");
    expect(tabIndexMinusOnes.length).toBe(29);
  });

  it("sets ARIA states: aria-selected, aria-current, and full date aria-label", () => {
    const selectedDate: PlainDate = { year: 1448, month: 1, day: 15 };
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 1 },
      selectedDate,
    });
    container.appendChild(grid.getElement());
    const table = grid.getElement();

    const selectedCell = table.querySelector(".tp-grid-cell[aria-selected='true']");
    expect(selectedCell).not.toBeNull();
    expect(selectedCell?.textContent).toBe("15");

    const selectedBtn = table.querySelector(".tp-day-btn[data-selected='true']");
    expect(selectedBtn).not.toBeNull();
    expect(selectedBtn?.textContent).toBe("15");

    // All other cells have aria-selected="false"
    const unselectedCells = table.querySelectorAll(
      ".tp-grid-cell:not(.tp-grid-cell-empty)[aria-selected='false']",
    );
    expect(unselectedCells.length).toBe(29);

    // Accessible name includes weekday, day, month, and year
    const day1Btn = table.querySelectorAll(".tp-day-btn")[0];
    expect(day1Btn?.getAttribute("aria-label")).toContain("Moharram al-Haraam 1448");
  });

  it("sets aria-disabled='true' for dates outside minDate and maxDate", () => {
    const minDate: PlainDate = { year: 1448, month: 1, day: 5 };
    const maxDate: PlainDate = { year: 1448, month: 1, day: 25 };

    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 10 },
      minDate,
      maxDate,
    });
    container.appendChild(grid.getElement());

    const table = grid.getElement();

    // Days 1-4 should be disabled
    for (let day = 1; day <= 4; day++) {
      const btn = table.querySelector(`.tp-day-btn[data-date="1448-01-0${day}"]`);
      expect(btn?.getAttribute("aria-disabled")).toBe("true");
      expect(btn?.classList.contains("tp-day-disabled")).toBe(true);
    }

    // Days 5-25 should NOT be disabled
    const day10Btn = table.querySelector('.tp-day-btn[data-date="1448-01-10"]');
    expect(day10Btn?.hasAttribute("aria-disabled")).toBe(false);

    // Days 26-30 should be disabled
    for (let day = 26; day <= 30; day++) {
      const btn = table.querySelector(`.tp-day-btn[data-date="1448-01-${day}"]`);
      expect(btn?.getAttribute("aria-disabled")).toBe("true");
      expect(btn?.classList.contains("tp-day-disabled")).toBe(true);
    }
  });

  it("navigates days with ArrowLeft and ArrowRight updating roving tabindex and focus", () => {
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 10 },
    });
    container.appendChild(grid.getElement());
    const table = grid.getElement();

    grid.focusActiveDay();
    expect(grid.getFocusedDate().day).toBe(10);

    // ArrowRight -> day 11
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(grid.getFocusedDate().day).toBe(11);
    expect(table.querySelector(".tp-day-btn[tabindex='0']")?.textContent).toBe("11");

    // ArrowLeft -> day 10
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(grid.getFocusedDate().day).toBe(10);
    expect(table.querySelector(".tp-day-btn[tabindex='0']")?.textContent).toBe("10");
  });

  it("mirrors ArrowLeft and ArrowRight in RTL mode", () => {
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 10 },
      isRtl: true,
    });
    container.appendChild(grid.getElement());
    const table = grid.getElement();

    grid.focusActiveDay();

    // In RTL, ArrowLeft moves forward (+1 day)
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(grid.getFocusedDate().day).toBe(11);

    // In RTL, ArrowRight moves backward (-1 day)
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(grid.getFocusedDate().day).toBe(10);
  });

  it("navigates weeks with ArrowUp (-7 days) and ArrowDown (+7 days)", () => {
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 10 },
    });
    container.appendChild(grid.getElement());
    const table = grid.getElement();

    grid.focusActiveDay();

    // ArrowDown -> day 17
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(grid.getFocusedDate().day).toBe(17);

    // ArrowUp -> day 10
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(grid.getFocusedDate().day).toBe(10);
  });

  it("moves to start/end of week with Home and End", () => {
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 15 },
      firstDayOfWeek: 0, // Sunday
    });
    container.appendChild(grid.getElement());
    const table = grid.getElement();

    grid.focusActiveDay();

    // Home -> start of current week
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    const focusedHome = grid.getFocusedDate();
    expect(focusedHome.day).toBeLessThanOrEqual(15);

    // End -> end of current week
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    const focusedEnd = grid.getFocusedDate();
    expect(focusedEnd.day).toBeGreaterThanOrEqual(15);
  });

  it("triggers onNavigate when navigating across month boundaries", () => {
    const onNavigate = vi.fn();
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 1 },
      onNavigate,
    });
    container.appendChild(grid.getElement());
    const table = grid.getElement();

    grid.focusActiveDay();

    // ArrowLeft from day 1 moves to previous month (year 1447, month 12, day 29 or 30)
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 1447,
        month: 12,
      }),
    );
  });

  it("triggers onNavigate for PageUp / PageDown and Shift+PageUp / Shift+PageDown", () => {
    const onNavigate = vi.fn();
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1445, month: 5, day: 10 },
      selectedDate: { year: 1445, month: 5, day: 10 },
      onNavigate,
    });
    container.appendChild(grid.getElement());
    const table = grid.getElement();

    grid.focusActiveDay();

    // PageDown -> next month (month 5 -> 6)
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
    expect(onNavigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ year: 1445, month: 6, day: 10 }),
    );

    // Reset grid to month 5
    grid.setVisibleDate({ year: 1445, month: 5, day: 10 });
    grid.focusActiveDay();
    onNavigate.mockClear();

    // PageUp -> previous month (month 5 -> 4)
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true }));
    expect(onNavigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ year: 1445, month: 4, day: 10 }),
    );

    // Reset grid to month 5
    grid.setVisibleDate({ year: 1445, month: 5, day: 10 });
    grid.focusActiveDay();
    onNavigate.mockClear();

    // Shift + PageDown -> next year (year 1445 -> 1446)
    table.dispatchEvent(
      new KeyboardEvent("keydown", { key: "PageDown", shiftKey: true, bubbles: true }),
    );
    expect(onNavigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ year: 1446, month: 5, day: 10 }),
    );

    // Reset grid to month 5
    grid.setVisibleDate({ year: 1445, month: 5, day: 10 });
    grid.focusActiveDay();
    onNavigate.mockClear();

    // Shift + PageUp -> previous year (year 1445 -> 1444)
    table.dispatchEvent(
      new KeyboardEvent("keydown", { key: "PageUp", shiftKey: true, bubbles: true }),
    );
    expect(onNavigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ year: 1444, month: 5, day: 10 }),
    );
  });

  it("selects date on Enter or Space and triggers onSelect if enabled", () => {
    const onSelect = vi.fn();
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 12 },
      onSelect,
    });
    container.appendChild(grid.getElement());
    const table = grid.getElement();

    grid.focusActiveDay();

    // Enter
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ year: 1448, month: 1, day: 12 }),
    );

    // Space on day 13
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    table.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ year: 1448, month: 1, day: 13 }),
    );
  });

  it("does NOT select date on Enter or click when date is disabled", () => {
    const onSelect = vi.fn();
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 2 },
      minDate: { year: 1448, month: 1, day: 10 },
      onSelect,
    });
    container.appendChild(grid.getElement());
    const table = grid.getElement();

    grid.focusActiveDay();

    // Enter on day 2 (disabled)
    table.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();

    // Click on disabled day button
    const day2Btn = table.querySelector('.tp-day-btn[data-date="1448-01-02"]') as HTMLButtonElement;
    day2Btn?.click();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("meets WCAG 2.5.8 target size >= 24px for all day buttons", () => {
    const grid = new MonthGrid({
      calendarEngine: fatimidAstronomicalCalendar,
      visibleDate: { year: 1448, month: 1, day: 1 },
    });
    container.appendChild(grid.getElement());

    const buttons = grid.getElement().querySelectorAll(".tp-day-btn");
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      // Target size in both dimensions must be >= 24px
      expect(rect.width).toBeGreaterThanOrEqual(24);
      expect(rect.height).toBeGreaterThanOrEqual(24);
    }
  });

  it("integrates with DialogShell on date selection", () => {
    const input = document.createElement("input");
    container.appendChild(input);

    const onSelect = vi.fn();
    const shell = new DialogShell(input, {
      initialDate: { year: 1448, month: 1, day: 10 },
      onSelect,
    });

    shell.open();
    expect(shell.isOpen()).toBe(true);

    const grid = shell.getGrid();
    const table = grid.getElement();

    // Click day 20
    const day20Btn = table.querySelector(
      '.tp-day-btn[data-date="1448-01-20"]',
    ) as HTMLButtonElement;
    day20Btn.click();

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ year: 1448, month: 1, day: 20 }),
    );
    expect(shell.getSelectedDate()).toEqual({ year: 1448, month: 1, day: 20 });
    // Shell closes on selection
    expect(shell.isOpen()).toBe(false);
  });
});
