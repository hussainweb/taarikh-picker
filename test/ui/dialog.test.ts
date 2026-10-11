import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialogShell } from "../../src/ui/dialog.js";
import { createPicker, TaarikhPicker } from "../../src/index.js";
import type { MonthLabels, PlainDate } from "../../src/engine/index.js";
import { fatimidAstronomicalCalendar } from "../../src/engine/index.js";
import { formatDayAriaLabel, formatMonthHeading } from "../../src/format/index.js";
import { resetUniqueIdCounter } from "../../src/ui/dom.js";
import {
  type MockDocument,
  type MockElement,
  setupMockDom,
  teardownMockDom,
} from "../helpers/mock-dom.js";

describe("DialogShell - WAI-ARIA APG Date Picker Dialog", () => {
  let doc: MockDocument;
  let container: MockElement;
  let input: MockElement;

  beforeEach(() => {
    resetUniqueIdCounter();
    const env = setupMockDom();
    doc = env.document;
    container = doc.createElement("form");
    doc.body.appendChild(container);
    input = doc.createElement("input");
    input.type = "text";
    container.appendChild(input);
  });

  afterEach(() => {
    teardownMockDom();
  });

  it("creates sibling trigger button and dialog without wrapping the input", () => {
    const shell = new DialogShell(input as unknown as HTMLInputElement);
    const elements = shell.getElements();

    // The input is still in container
    expect(input.parentNode).toBe(container);

    // Trigger button is adjacent sibling
    expect(elements.trigger.parentNode).toBe(container);
    expect(elements.trigger.tagName).toBe("BUTTON");
    expect(elements.trigger.type).toBe("button");
    expect(elements.trigger.className).toBe("tp-btn-trigger");
    expect(elements.trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(elements.trigger.getAttribute("aria-expanded")).toBe("false");
    expect(elements.trigger.getAttribute("aria-controls")).toBe(elements.dialog.id);
    expect(elements.trigger.getAttribute("aria-label")).toBe("Choose date");

    // Dialog is also adjacent sibling (not appended to document.body)
    expect(elements.dialog.parentNode).toBe(container);
    expect(elements.dialog.tagName).toBe("DIALOG");
    expect(elements.dialog.className).toBe("tp-dialog");
    expect(elements.dialog.getAttribute("closedby")).toBe("any");
    expect(elements.dialog.getAttribute("aria-labelledby")).toBe(elements.title.id);

    // CSS Anchor Positioning properties are set
    const anchorName = input.style.getPropertyValue("anchor-name");
    expect(anchorName).toMatch(/^--tp-anchor-tp-\d+$/);
    expect(elements.dialog.style.getPropertyValue("position-anchor")).toBe(anchorName);
  });

  it("contains header, selectors, live region, grid container, and footer", () => {
    const shell = new DialogShell(input as unknown as HTMLInputElement, {
      initialDate: { year: 1448, month: 1, day: 15 },
    });
    const elements = shell.getElements();

    // Header buttons & selectors
    expect(elements.btnPrev.className).toBe("tp-btn-prev");
    expect(elements.btnNext.className).toBe("tp-btn-next");
    expect(elements.selectMonth.className).toBe("tp-select-month");
    expect(elements.selectYear.className).toBe("tp-select-year");
    expect(elements.selectMonth.value).toBe("1");
    expect(elements.selectYear.value).toBe("1448");

    // Polite live region
    expect(elements.liveRegion.className).toBe("tp-live-region");
    expect(elements.liveRegion.getAttribute("aria-live")).toBe("polite");
    expect(elements.liveRegion.textContent).toBe("Moharram al-Haraam 1448");

    // Grid container placeholder
    expect(elements.gridContainer.className).toBe("tp-grid-container");

    // Footer buttons
    expect(elements.btnToday.className).toBe("tp-btn-today");
    expect(elements.btnClear.className).toBe("tp-btn-clear");
    expect(elements.btnToday.textContent).toBe("Today");
    expect(elements.btnClear.textContent).toBe("Clear");
  });

  it("opens with showModal() on trigger click and closes on subsequent click", () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const shell = new DialogShell(input as unknown as HTMLInputElement, { onOpen, onClose });
    const elements = shell.getElements();

    expect(shell.isOpen()).toBe(false);
    expect(elements.trigger.getAttribute("aria-expanded")).toBe("false");

    // Click trigger to open
    elements.trigger.dispatchEvent(new Event("click"));
    expect(shell.isOpen()).toBe(true);
    expect(elements.trigger.getAttribute("aria-expanded")).toBe("true");
    expect(onOpen).toHaveBeenCalledTimes(1);

    // Click trigger to close
    elements.trigger.dispatchEvent(new Event("click"));
    expect(shell.isOpen()).toBe(false);
    expect(elements.trigger.getAttribute("aria-expanded")).toBe("false");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when clicking directly on the dialog backdrop", () => {
    const shell = new DialogShell(input as unknown as HTMLInputElement);
    const elements = shell.getElements();

    shell.open();
    expect(shell.isOpen()).toBe(true);

    // Synthetic click on backdrop (e.target === dialog outside bounding box)
    const backdropClick = new MouseEvent("click", {
      bubbles: true,
      clientX: 50, // Outside rect [100, 400]
      clientY: 50,
    });
    Object.defineProperty(backdropClick, "target", { value: elements.dialog });
    elements.dialog.dispatchEvent(backdropClick);

    expect(shell.isOpen()).toBe(false);
    expect(elements.trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("does NOT close when clicking inside the dialog content", () => {
    const shell = new DialogShell(input as unknown as HTMLInputElement);
    const elements = shell.getElements();

    shell.open();
    expect(shell.isOpen()).toBe(true);

    // Click inside header
    const innerClick = new MouseEvent("click", { bubbles: true, clientX: 150, clientY: 150 });
    Object.defineProperty(innerClick, "target", { value: elements.header });
    elements.dialog.dispatchEvent(innerClick);

    expect(shell.isOpen()).toBe(true);
  });

  it("navigates months with previous and next buttons and announces via live region", () => {
    const onMonthChange = vi.fn();
    const shell = new DialogShell(input as unknown as HTMLInputElement, {
      initialDate: { year: 1448, month: 1, day: 10 },
      onMonthChange,
    });
    const elements = shell.getElements();

    expect(elements.liveRegion.textContent).toBe("Moharram al-Haraam 1448");

    // Click Next month
    elements.btnNext.dispatchEvent(new Event("click"));
    expect(shell.getVisibleDate().month).toBe(2);
    expect(shell.getVisibleDate().year).toBe(1448);
    expect(elements.selectMonth.value).toBe("2");
    expect(elements.liveRegion.textContent).toBe("Safar al-Muzaffar 1448");
    expect(onMonthChange).toHaveBeenCalledWith(expect.objectContaining({ month: 2, year: 1448 }));

    // Click Prev month
    elements.btnPrev.dispatchEvent(new Event("click"));
    expect(shell.getVisibleDate().month).toBe(1);
    expect(shell.getVisibleDate().year).toBe(1448);
    expect(elements.selectMonth.value).toBe("1");
    expect(elements.liveRegion.textContent).toBe("Moharram al-Haraam 1448");
  });

  it("updates visible date when month or year selects change", () => {
    const shell = new DialogShell(input as unknown as HTMLInputElement, {
      initialDate: { year: 1448, month: 1, day: 10 },
    });
    const elements = shell.getElements();

    // Change month select to month 9 (Ramadan al-Moazzam)
    elements.selectMonth.value = "9";
    elements.selectMonth.dispatchEvent(new Event("change"));
    expect(shell.getVisibleDate().month).toBe(9);
    expect(elements.liveRegion.textContent).toBe("Ramadan al-Moazzam 1448");

    // Change year select to 1450
    elements.selectYear.value = "1450";
    elements.selectYear.dispatchEvent(new Event("change"));
    expect(shell.getVisibleDate().year).toBe(1450);
    expect(elements.liveRegion.textContent).toBe("Ramadan al-Moazzam 1450");
  });

  it("bounds navigation buttons when minDate and maxDate are specified", () => {
    const minDate: PlainDate = { year: 1448, month: 2, day: 1 };
    const maxDate: PlainDate = { year: 1448, month: 4, day: 29 };

    const shell = new DialogShell(input as unknown as HTMLInputElement, {
      initialDate: { year: 1448, month: 2, day: 10 },
      minDate,
      maxDate,
    });
    const elements = shell.getElements();

    // At minDate month: prev button should be disabled
    expect(elements.btnPrev.disabled).toBe(true);
    expect(elements.btnPrev.getAttribute("aria-disabled")).toBe("true");
    expect(elements.btnNext.disabled).toBe(false);

    // Advance to month 3
    elements.btnNext.dispatchEvent(new Event("click"));
    expect(elements.btnPrev.disabled).toBe(false);
    expect(elements.btnNext.disabled).toBe(false);

    // Advance to month 4 (maxDate): next button should be disabled
    elements.btnNext.dispatchEvent(new Event("click"));
    expect(elements.btnNext.disabled).toBe(true);
    expect(elements.btnNext.getAttribute("aria-disabled")).toBe("true");
    expect(elements.btnPrev.disabled).toBe(false);
  });

  it("handles Today and Clear footer buttons", () => {
    const onToday = vi.fn();
    const onClear = vi.fn();
    const shell = new DialogShell(input as unknown as HTMLInputElement, {
      initialDate: { year: 1400, month: 1, day: 1 },
      onToday,
      onClear,
    });
    const elements = shell.getElements();

    input.value = "1400-01-01";

    // Click Today
    elements.btnToday.dispatchEvent(new Event("click"));
    expect(onToday).toHaveBeenCalled();
    expect(shell.getVisibleDate().year).toBeGreaterThan(1440);

    // Click Clear
    elements.btnClear.dispatchEvent(new Event("click"));
    expect(input.value).toBe("");
    expect(onClear).toHaveBeenCalled();
  });

  it("provides complete, idempotent destroy() lifecycle unbinding listeners and removing DOM nodes", () => {
    input.style.setProperty("anchor-name", "--original-anchor");

    const shell = new DialogShell(input as unknown as HTMLInputElement);
    const elements = shell.getElements();

    shell.open();
    expect(shell.isOpen()).toBe(true);

    // Destroy
    shell.destroy();

    // Elements removed from DOM
    expect(elements.trigger.parentNode).toBeNull();
    expect(elements.dialog.parentNode).toBeNull();

    // Original anchor restored
    expect(input.style.getPropertyValue("anchor-name")).toBe("--original-anchor");

    // Repeating destroy is a safe no-op
    expect(() => shell.destroy()).not.toThrow();
  });

  it("ensures dialog month name matches formatMonthHeading and formatDayAriaLabel", () => {
    const testDate: PlainDate = { year: 1445, month: 9, day: 1 };
    const shell = new DialogShell(input as unknown as HTMLInputElement, {
      initialDate: testDate,
    });
    const elements = shell.getElements();

    const heading = formatMonthHeading(testDate, fatimidAstronomicalCalendar);
    expect(elements.liveRegion.textContent).toBe(heading);

    const dayAria = formatDayAriaLabel(testDate, fatimidAstronomicalCalendar);
    expect(dayAria).toContain("Ramadan al-Moazzam");
    expect(elements.liveRegion.textContent).toContain("Ramadan al-Moazzam");
    expect(elements.selectMonth.children[8]?.textContent).toBe("Ramadan al-Moazzam");
  });

  it("supports custom MonthLabels in DialogShell", () => {
    const customLabels: MonthLabels = {
      long: [
        "M1-Long",
        "M2-Long",
        "M3-Long",
        "M4-Long",
        "M5-Long",
        "M6-Long",
        "M7-Long",
        "M8-Long",
        "M9-Long",
        "M10-Long",
        "M11-Long",
        "M12-Long",
      ],
      short: ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"],
    };

    const shell = new DialogShell(input as unknown as HTMLInputElement, {
      initialDate: { year: 1448, month: 3, day: 1 },
      labels: { months: customLabels },
    });
    const elements = shell.getElements();

    expect(elements.liveRegion.textContent).toBe("M3-Long 1448");
    expect(elements.selectMonth.children[2]?.textContent).toBe("M3-Long");
  });

  it("uses fatimidAstronomicalCalendar as the default calendar engine", () => {
    const shell = new DialogShell(input as unknown as HTMLInputElement, {
      initialDate: { year: 1445, month: 12, day: 29 },
    });
    const elements = shell.getElements();

    expect(elements.liveRegion.textContent).toBe("Zilhajj al-Haraam 1445");
    expect(fatimidAstronomicalCalendar.isKabisa(1445)).toBe(true);
    expect(fatimidAstronomicalCalendar.daysInMonth(1445, 12)).toBe(30);
  });
});

describe("TaarikhPicker & createPicker API", () => {
  beforeEach(() => {
    setupMockDom();
  });

  afterEach(() => {
    teardownMockDom();
  });

  it("creates a picker instance with createPicker(input, options)", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);

    const picker = createPicker(input as unknown as HTMLInputElement, {
      initialDate: { year: 1448, month: 1, day: 1 },
    });

    expect(picker instanceof TaarikhPicker).toBe(true);
    expect(picker.isOpen()).toBe(false);

    picker.open();
    expect(picker.isOpen()).toBe(true);

    picker.close();
    expect(picker.isOpen()).toBe(false);

    picker.destroy();
    expect(picker.getDialogShell()).toBeUndefined();
  });

  it("supports instantiation without input for option holder backwards-compatibility", () => {
    const picker = new TaarikhPicker({ locale: "ar" });
    expect(picker.getOptions().locale).toBe("ar");
    expect(picker.getInput()).toBeUndefined();
    expect(picker.isOpen()).toBe(false);
    expect(() => picker.destroy()).not.toThrow();
  });
});
