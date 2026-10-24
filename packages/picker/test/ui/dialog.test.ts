import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../src/style.css";
import { DialogShell } from "../../src/ui/dialog.js";
import { createPicker, TaarikhPicker } from "../../src/index.js";
import type { MonthLabels, PlainDate } from "@taarikh/core";
import { fatimidAstronomicalCalendar, formatDayAriaLabel, formatMonthHeading } from "@taarikh/core";
import { resetUniqueIdCounter } from "../../src/ui/dom.js";

describe("DialogShell - WAI-ARIA APG Date Picker Dialog", () => {
  let container: HTMLFormElement;
  let input: HTMLInputElement;

  beforeEach(() => {
    resetUniqueIdCounter();
    container = document.createElement("form");
    document.body.appendChild(container);
    input = document.createElement("input");
    input.type = "text";
    container.appendChild(input);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
  });

  it("creates sibling trigger button and dialog without wrapping the input", () => {
    const shell = new DialogShell(input);
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
    const shell = new DialogShell(input, {
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

  it("opens with showModal() on trigger click and closes on subsequent click", async () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const shell = new DialogShell(input, { onOpen, onClose });
    const elements = shell.getElements();

    expect(shell.isOpen()).toBe(false);
    expect(elements.trigger.getAttribute("aria-expanded")).toBe("false");

    // Click trigger to open
    elements.trigger.click();
    expect(shell.isOpen()).toBe(true);
    expect(elements.trigger.getAttribute("aria-expanded")).toBe("true");
    expect(onOpen).toHaveBeenCalledTimes(1);

    // Click trigger to close
    elements.trigger.click();
    expect(shell.isOpen()).toBe(false);
    expect(elements.trigger.getAttribute("aria-expanded")).toBe("false");
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("closes when clicking directly on the dialog backdrop", () => {
    const shell = new DialogShell(input);
    const elements = shell.getElements();

    shell.open();
    expect(shell.isOpen()).toBe(true);

    const rect = elements.dialog.getBoundingClientRect();
    const backdropClick = new MouseEvent("click", {
      bubbles: true,
      clientX: rect.left - 20,
      clientY: rect.top - 20,
    });
    elements.dialog.dispatchEvent(backdropClick);

    expect(shell.isOpen()).toBe(false);
    expect(elements.trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("does NOT close when clicking inside the dialog content", () => {
    const shell = new DialogShell(input);
    const elements = shell.getElements();

    shell.open();
    expect(shell.isOpen()).toBe(true);

    // Click inside header
    const innerClick = new MouseEvent("click", { bubbles: true, clientX: 150, clientY: 150 });
    elements.header.dispatchEvent(innerClick);

    expect(shell.isOpen()).toBe(true);
  });

  it("navigates months with previous and next buttons and announces via live region", () => {
    const onMonthChange = vi.fn();
    const shell = new DialogShell(input, {
      initialDate: { year: 1448, month: 1, day: 10 },
      onMonthChange,
    });
    const elements = shell.getElements();

    expect(elements.liveRegion.textContent).toBe("Moharram al-Haraam 1448");

    // Click Next month
    elements.btnNext.click();
    expect(shell.getVisibleDate().month).toBe(2);
    expect(shell.getVisibleDate().year).toBe(1448);
    expect(elements.selectMonth.value).toBe("2");
    expect(elements.liveRegion.textContent).toBe("Safar al-Muzaffar 1448");
    expect(onMonthChange).toHaveBeenCalledWith(expect.objectContaining({ month: 2, year: 1448 }));

    // Click Prev month
    elements.btnPrev.click();
    expect(shell.getVisibleDate().month).toBe(1);
    expect(shell.getVisibleDate().year).toBe(1448);
    expect(elements.selectMonth.value).toBe("1");
    expect(elements.liveRegion.textContent).toBe("Moharram al-Haraam 1448");
  });

  it("updates visible date when month or year selects change", () => {
    const shell = new DialogShell(input, {
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

    const shell = new DialogShell(input, {
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
    elements.btnNext.click();
    expect(elements.btnPrev.disabled).toBe(false);
    expect(elements.btnNext.disabled).toBe(false);

    // Advance to month 4 (maxDate): next button should be disabled
    elements.btnNext.click();
    expect(elements.btnNext.disabled).toBe(true);
    expect(elements.btnNext.getAttribute("aria-disabled")).toBe("true");
    expect(elements.btnPrev.disabled).toBe(false);
  });

  it("handles Today and Clear footer buttons", () => {
    const onToday = vi.fn();
    const onClear = vi.fn();
    const shell = new DialogShell(input, {
      initialDate: { year: 1400, month: 1, day: 1 },
      onToday,
      onClear,
    });
    const elements = shell.getElements();

    input.value = "1400-01-01";

    // Click Today
    elements.btnToday.click();
    expect(onToday).toHaveBeenCalled();
    expect(shell.getVisibleDate().year).toBeGreaterThan(1440);

    // Click Clear
    elements.btnClear.click();
    expect(input.value).toBe("");
    expect(onClear).toHaveBeenCalled();
  });

  it("provides complete, idempotent destroy() lifecycle unbinding listeners and removing DOM nodes", () => {
    input.style.setProperty("anchor-name", "--original-anchor");

    const shell = new DialogShell(input);
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
    const shell = new DialogShell(input, {
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

    const shell = new DialogShell(input, {
      initialDate: { year: 1448, month: 3, day: 1 },
      labels: { months: customLabels },
    });
    const elements = shell.getElements();

    expect(elements.liveRegion.textContent).toBe("M3-Long 1448");
    expect(elements.selectMonth.children[2]?.textContent).toBe("M3-Long");
  });

  it("uses fatimidAstronomicalCalendar as the default calendar engine", () => {
    const shell = new DialogShell(input, {
      initialDate: { year: 1445, month: 12, day: 29 },
    });
    const elements = shell.getElements();

    expect(elements.liveRegion.textContent).toBe("Zilhajj al-Haraam 1445");
    expect(fatimidAstronomicalCalendar.isKabisa(1445)).toBe(true);
    expect(fatimidAstronomicalCalendar.daysInMonth(1445, 12)).toBe(30);
  });
});

describe("TaarikhPicker & createPicker API", () => {
  let input: HTMLInputElement;

  beforeEach(() => {
    input = document.createElement("input");
    document.body.appendChild(input);
  });

  afterEach(() => {
    input.remove();
    document.body.innerHTML = "";
  });

  it("creates a picker instance with createPicker(input, options)", () => {
    const picker = createPicker(input, {
      initialDate: { year: 1448, month: 1, day: 1 },
    });

    expect(picker instanceof TaarikhPicker).toBe(true);
    expect(picker.isOpen()).toBe(false);
    expect(picker.getInput()).toBe(input);
    expect(picker.getDate()).toBeNull();

    picker.open();
    expect(picker.isOpen()).toBe(true);

    picker.close();
    expect(picker.isOpen()).toBe(false);

    picker.destroy();
    expect(picker.isOpen()).toBe(false);
  });

  it("supports getDate() and setDate(date) programmatic API", () => {
    const picker = createPicker(input);
    expect(picker.getDate()).toBeNull();

    // Set a date
    picker.setDate({ year: 1445, month: 9, day: 15 });
    expect(picker.getDate()).toEqual({ year: 1445, month: 9, day: 15 });
    expect(input.value).toBe("1445-09-15");

    // Clear date with null
    picker.setDate(null);
    expect(picker.getDate()).toBeNull();
    expect(input.value).toBe("");

    picker.destroy();
  });

  it("supports dir option and applies dir attribute to dialog", () => {
    const pickerRtl = createPicker(input, { dir: "rtl" });
    const elements = pickerRtl.getElements();
    expect(elements?.dialog.getAttribute("dir")).toBe("rtl");
    pickerRtl.destroy();

    const inputLtr = document.createElement("input");
    document.body.appendChild(inputLtr);
    const pickerLtr = createPicker(inputLtr, { dir: "ltr" });
    expect(pickerLtr.getElements()?.dialog.getAttribute("dir")).toBeNull();
    pickerLtr.destroy();
    inputLtr.remove();
  });

  it("supports [Symbol.dispose] for using declarations and idempotent destroy", () => {
    const picker = createPicker(input);
    expect(() => picker[Symbol.dispose]()).not.toThrow();
    // Idempotent secondary call
    expect(() => picker.destroy()).not.toThrow();
  });

  it("detects dir from element or ancestor and mirrors prev/next glyphs in RTL", () => {
    // 1. Ancestor with dir="rtl"
    const wrapper = document.createElement("div");
    wrapper.setAttribute("dir", "rtl");
    document.body.appendChild(wrapper);
    const rtlInput = document.createElement("input");
    wrapper.appendChild(rtlInput);

    const picker = createPicker(rtlInput);
    const elements = picker.getElements()!;
    expect(elements.dialog.getAttribute("dir")).toBe("rtl");
    // Mirrored glyphs in RTL: prev points right (›), next points left (‹)
    expect(elements.btnPrev.textContent).toBe("›");
    expect(elements.btnNext.textContent).toBe("‹");

    picker.destroy();
    wrapper.remove();

    // 2. Element itself with dir="rtl"
    const selfRtlInput = document.createElement("input");
    selfRtlInput.setAttribute("dir", "rtl");
    document.body.appendChild(selfRtlInput);

    const picker2 = createPicker(selfRtlInput);
    const elements2 = picker2.getElements()!;
    expect(elements2.dialog.getAttribute("dir")).toBe("rtl");
    expect(elements2.btnPrev.textContent).toBe("›");
    expect(elements2.btnNext.textContent).toBe("‹");

    picker2.destroy();
    selfRtlInput.remove();

    // 3. Overriding dir option with 'ltr' cancels RTL
    const ltrOverrideInput = document.createElement("input");
    ltrOverrideInput.setAttribute("dir", "rtl");
    document.body.appendChild(ltrOverrideInput);

    const picker3 = createPicker(ltrOverrideInput, { dir: "ltr" });
    expect(picker3.getElements()?.dialog.getAttribute("dir")).toBeNull();
    expect(picker3.getElements()?.btnPrev.textContent).toBe("‹");
    expect(picker3.getElements()?.btnNext.textContent).toBe("›");

    picker3.destroy();
    ltrOverrideInput.remove();
  });

  it("customizes every button label and aria label via labels option", () => {
    const picker = createPicker(input, {
      labels: {
        trigger: "Ouvrir le calendrier",
        prev: "Préc",
        previousMonth: "Mois précédent",
        next: "Suiv",
        nextMonth: "Mois suivant",
        today: "Aujourd'hui",
        clear: "Effacer",
        close: "Fermer",
        monthSelect: "Sélectionner le mois",
        yearSelect: "Sélectionner l'année",
        dialogTitle: "Choisir une date",
        liveRegion: (month, year) => `Affichage: ${month} ${year}`,
      },
    });

    const elements = picker.getElements()!;

    expect(elements.trigger.getAttribute("aria-label")).toBe("Ouvrir le calendrier");
    expect(elements.trigger.title).toBe("Ouvrir le calendrier");
    expect(elements.btnPrev.textContent).toBe("Préc");
    expect(elements.btnPrev.getAttribute("aria-label")).toBe("Mois précédent");
    expect(elements.btnNext.textContent).toBe("Suiv");
    expect(elements.btnNext.getAttribute("aria-label")).toBe("Mois suivant");
    expect(elements.btnToday.textContent).toBe("Aujourd'hui");
    expect(elements.btnClear.textContent).toBe("Effacer");
    expect(elements.selectMonth.getAttribute("aria-label")).toBe("Sélectionner le mois");
    expect(elements.selectYear.getAttribute("aria-label")).toBe("Sélectionner l'année");
    expect(elements.title.textContent).toBe("Choisir une date");
    expect(elements.liveRegion.textContent).toContain("Affichage:");

    picker.destroy();
  });

  it("localizes year select options and live region with Arabic numerals when locale is ar-EG", () => {
    const picker = createPicker(input, {
      locale: "ar-EG",
      initialDate: { year: 1445, month: 9, day: 1 },
    });
    const elements = picker.getElements()!;

    // Year select text is localized to Eastern Arabic numerals, but value remains ASCII!
    const yearOption = elements.selectYear.querySelector('option[value="1445"]');
    expect(yearOption).not.toBeNull();
    expect(yearOption?.textContent).toBe("١٤٤٥");
    expect(yearOption?.getAttribute("value")).toBe("1445");

    // Live region uses localized year
    expect(elements.liveRegion.textContent).toContain("١٤٤٥");

    picker.destroy();
  });

  it("keeps all header navigation controls strictly contained within the dialog boundaries", () => {
    // Test 1: Standard month with long name (Jumada al-Ula)
    const picker1 = createPicker(input, {
      initialDate: { year: 1448, month: 5, day: 4 }, // Jumada al-Ula 1448
    });
    picker1.open();
    const el1 = picker1.getElements()!;
    const dialogRect1 = el1.dialog.getBoundingClientRect();
    const prevRect1 = el1.btnPrev.getBoundingClientRect();
    const monthRect1 = el1.selectMonth.getBoundingClientRect();
    const yearRect1 = el1.selectYear.getBoundingClientRect();
    const nextRect1 = el1.btnNext.getBoundingClientRect();

    expect(prevRect1.left).toBeGreaterThanOrEqual(dialogRect1.left);
    expect(monthRect1.left).toBeGreaterThanOrEqual(dialogRect1.left);
    expect(yearRect1.right).toBeLessThanOrEqual(dialogRect1.right);
    expect(nextRect1.right).toBeLessThanOrEqual(dialogRect1.right);
    picker1.destroy();

    // Test 2: Longest month name (Ramadan al-Moazzam)
    const picker2 = createPicker(input, {
      initialDate: { year: 1448, month: 9, day: 1 }, // Ramadan al-Moazzam 1448
    });
    picker2.open();
    const el2 = picker2.getElements()!;
    const dialogRect2 = el2.dialog.getBoundingClientRect();
    const prevRect2 = el2.btnPrev.getBoundingClientRect();
    const monthRect2 = el2.selectMonth.getBoundingClientRect();
    const yearRect2 = el2.selectYear.getBoundingClientRect();
    const nextRect2 = el2.btnNext.getBoundingClientRect();

    expect(prevRect2.left).toBeGreaterThanOrEqual(dialogRect2.left);
    expect(monthRect2.left).toBeGreaterThanOrEqual(dialogRect2.left);
    expect(yearRect2.right).toBeLessThanOrEqual(dialogRect2.right);
    expect(nextRect2.right).toBeLessThanOrEqual(dialogRect2.right);
    picker2.destroy();

    // Test 3: RTL with Arabic labels
    const picker3 = createPicker(input, {
      dir: "rtl",
      locale: "ar-EG",
      initialDate: { year: 1448, month: 11, day: 1 }, // Zilqadah al-Haram
    });
    picker3.open();
    const el3 = picker3.getElements()!;
    const dialogRect3 = el3.dialog.getBoundingClientRect();
    const prevRect3 = el3.btnPrev.getBoundingClientRect();
    const monthRect3 = el3.selectMonth.getBoundingClientRect();
    const yearRect3 = el3.selectYear.getBoundingClientRect();
    const nextRect3 = el3.btnNext.getBoundingClientRect();

    expect(prevRect3.right).toBeLessThanOrEqual(dialogRect3.right);
    expect(prevRect3.left).toBeGreaterThanOrEqual(dialogRect3.left);
    expect(nextRect3.left).toBeGreaterThanOrEqual(dialogRect3.left);
    expect(nextRect3.right).toBeLessThanOrEqual(dialogRect3.right);
    expect(monthRect3.left).toBeGreaterThanOrEqual(dialogRect3.left);
    expect(yearRect3.left).toBeGreaterThanOrEqual(dialogRect3.left);
    picker3.destroy();
  });

  it("uses block-end span-inline-end for standard dropdown anchor positioning on desktop viewports (> 480px)", async () => {
    const iframe = document.createElement("iframe");
    iframe.style.width = "600px";
    iframe.style.height = "800px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    for (const style of document.head.querySelectorAll("style, link[rel='stylesheet']")) {
      doc.head.appendChild(style.cloneNode(true));
    }

    const desktopInput = doc.createElement("input");
    desktopInput.type = "text";
    doc.body.appendChild(desktopInput);

    const picker = createPicker(desktopInput);
    picker.open();
    const el = picker.getElements()!;
    const cs = iframe.contentWindow!.getComputedStyle(el.dialog);
    const positionArea = cs.getPropertyValue("position-area");
    if (positionArea) {
      expect(positionArea).toContain("span-end");
      expect(positionArea).not.toContain("span-start");
    }
    picker.destroy();
    iframe.remove();
  });

  it("renders as a full-width bottom sheet without anchor positioning clipping on mobile viewports (tp-aen / #2)", async () => {
    const iframe = document.createElement("iframe");
    iframe.style.width = "390px";
    iframe.style.height = "844px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    for (const style of document.head.querySelectorAll("style, link[rel='stylesheet']")) {
      doc.head.appendChild(style.cloneNode(true));
    }

    const mobileInput = doc.createElement("input");
    mobileInput.type = "text";
    doc.body.appendChild(mobileInput);

    const picker = createPicker(mobileInput, {
      initialDate: { year: 1448, month: 5, day: 9 }, // Jumada al-Ula 1448
    });
    picker.open();
    const el = picker.getElements()!;
    const cs = iframe.contentWindow!.getComputedStyle(el.dialog);
    expect(cs.position).toBe("fixed");
    const mobilePositionArea = cs.getPropertyValue("position-area");
    expect(mobilePositionArea || "none").toBe("none");

    const dialogRect = el.dialog.getBoundingClientRect();
    expect(dialogRect.width).toBeCloseTo(390, -1);

    // Verify all day buttons are contained within the dialog boundaries
    const dayBtns = el.dialog.querySelectorAll<HTMLButtonElement>(".tp-day-btn");
    expect(dayBtns.length).toBeGreaterThan(0);
    for (const btn of dayBtns) {
      const btnRect = btn.getBoundingClientRect();
      expect(btnRect.left).toBeGreaterThanOrEqual(dialogRect.left);
      expect(btnRect.right).toBeLessThanOrEqual(dialogRect.right);
    }

    picker.destroy();
    iframe.remove();
  });

  it("isolates picker layout against unlayered host theme resets while allowing intentional token and class overrides (tp-0ic / #4)", async () => {
    const iframe = document.createElement("iframe");
    iframe.style.width = "800px";
    iframe.style.height = "800px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    const win = iframe.contentWindow!;

    for (const style of document.head.querySelectorAll("style, link[rel='stylesheet']")) {
      doc.head.appendChild(style.cloneNode(true));
    }

    // Inject unlayered host theme resets AFTER picker stylesheet, plus intentional overrides
    const hostStyle = doc.createElement("style");
    hostStyle.textContent = `
      table {
        width: 100%;
        margin: 24px 0;
        border: 3px solid rgb(220, 38, 38);
      }
      table thead th,
      table tbody td {
        padding: 18px 24px;
        border: 2px solid rgb(220, 38, 38);
        background: rgb(254, 226, 226);
        text-transform: uppercase;
      }
      button,
      .form-item button {
        padding: 16px 32px;
        margin: 12px;
        background: rgb(220, 38, 38);
        color: rgb(255, 255, 255);
        text-transform: uppercase;
      }
      select,
      .form-item select {
        width: 100%;
        min-height: 52px;
        padding: 14px 20px;
        margin: 14px;
      }
      header,
      footer {
        padding: 24px;
        margin: 20px;
        background: rgb(254, 226, 226);
      }

      /* Intentional Override 1: CSS custom properties */
      .custom-tokens {
        --tp-accent: rgb(13, 148, 136);
        --tp-selected-text: rgb(240, 253, 250);
        --tp-radius: 16px;
      }

      /* Intentional Override 2: Direct .tp-dialog .tp-* selector */
      .tp-dialog.custom-class .tp-day-btn {
        border-radius: 9999px;
      }
    `;
    doc.head.appendChild(hostStyle);

    // 1. Default picker inside .form-item
    const formItem1 = doc.createElement("div");
    formItem1.className = "form-item";
    const input1 = doc.createElement("input");
    input1.type = "text";
    input1.value = "1448-05-09";
    formItem1.appendChild(input1);
    doc.body.appendChild(formItem1);

    const picker1 = createPicker(input1);
    picker1.open();
    const el1 = picker1.getElements()!;

    // Verify accidental host resets do NOT leak into trigger or dialog controls
    expect(win.getComputedStyle(el1.trigger).padding).toBe("4px 8px");
    expect(win.getComputedStyle(el1.trigger).backgroundColor).not.toBe("rgb(220, 38, 38)");
    expect(win.getComputedStyle(el1.btnPrev).padding).toBe("4px 8px");
    expect(win.getComputedStyle(el1.btnPrev).textTransform).toBe("none");
    expect(win.getComputedStyle(el1.selectMonth).padding).toBe("4px 6px");
    expect(win.getComputedStyle(el1.selectMonth).margin).toBe("0px");
    const grid1 = el1.grid!;
    expect(win.getComputedStyle(grid1).margin).toBe("0px");

    const th1 = grid1.querySelector<HTMLElement>(".tp-grid-head-cell")!;
    const td1 = grid1.querySelector<HTMLElement>(".tp-grid-cell:not(.tp-grid-cell-empty)")!;
    const unselectedBtn1 = grid1.querySelector<HTMLElement>(
      '.tp-day-btn:not([data-selected="true"])',
    )!;
    const selectedBtn1 = grid1.querySelector<HTMLElement>('.tp-day-btn[data-selected="true"]')!;

    expect(win.getComputedStyle(th1).padding).toBe("4px 0px 6px");
    expect(win.getComputedStyle(th1).textTransform).toBe("none");
    expect(win.getComputedStyle(td1).padding).toBe("2px");
    expect(win.getComputedStyle(unselectedBtn1).padding).toBe("0px");
    expect(win.getComputedStyle(unselectedBtn1).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(win.getComputedStyle(selectedBtn1).backgroundColor).toBe("rgb(26, 115, 232)");
    expect(win.getComputedStyle(selectedBtn1).color).toBe("rgb(255, 255, 255)");

    const dialogRect1 = el1.dialog.getBoundingClientRect();
    const nextRect1 = el1.btnNext.getBoundingClientRect();
    expect(nextRect1.right).toBeLessThanOrEqual(dialogRect1.right);
    picker1.destroy();

    // 2. Intentional override via --tp-* custom properties and .tp-dialog .tp-* selector
    const formItem2 = doc.createElement("div");
    formItem2.className = "form-item custom-tokens";
    const input2 = doc.createElement("input");
    input2.type = "text";
    input2.value = "1448-05-09";
    formItem2.appendChild(input2);
    doc.body.appendChild(formItem2);

    const picker2 = createPicker(input2);
    const el2 = picker2.getElements()!;
    el2.dialog.classList.add("custom-class");
    picker2.open();

    const selectedBtn2 = el2.grid!.querySelector<HTMLElement>('.tp-day-btn[data-selected="true"]')!;
    expect(win.getComputedStyle(el2.dialog).borderRadius).toBe("16px");
    expect(win.getComputedStyle(selectedBtn2).backgroundColor).toBe("rgb(13, 148, 136)");
    expect(win.getComputedStyle(selectedBtn2).color).toBe("rgb(240, 253, 250)");
    expect(win.getComputedStyle(selectedBtn2).borderRadius).toBe("9999px");

    picker2.destroy();
    iframe.remove();
  });
});
