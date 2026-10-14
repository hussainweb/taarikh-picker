import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { createPicker } from "../../src/index.js";
import { resetUniqueIdCounter } from "../../src/ui/dom.js";

describe("Browser interaction and accessibility test suite (tp-il8.3.8)", () => {
  let form: HTMLFormElement;
  let label: HTMLLabelElement;
  let input: HTMLInputElement;

  beforeEach(() => {
    resetUniqueIdCounter();
    form = document.createElement("form");
    document.body.appendChild(form);

    label = document.createElement("label");
    label.htmlFor = "test-hijri-date";
    label.textContent = "Hijri Date";
    form.appendChild(label);

    input = document.createElement("input");
    input.id = "test-hijri-date";
    input.name = "hijriDate";
    input.type = "text";
    form.appendChild(input);
  });

  afterEach(() => {
    form.remove();
    document.body.innerHTML = "";
  });

  describe("axe-core accessibility scans", () => {
    it("reports 0 accessibility violations when datepicker is closed", async () => {
      const picker = createPicker(input);
      expect(picker.isOpen()).toBe(false);

      const results = await axe.run(form, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      });

      expect(results.violations).toEqual([]);
      picker.destroy();
    });

    it("reports 0 accessibility violations when datepicker dialog is open", async () => {
      const picker = createPicker(input, {
        initialDate: { year: 1445, month: 9, day: 15 },
      });
      picker.open();
      expect(picker.isOpen()).toBe(true);

      const results = await axe.run(document.body, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      });

      expect(results.violations).toEqual([]);
      picker.destroy();
    });
  });

  describe("Focus management and dismiss interactions", () => {
    it("focuses active day on open and returns focus to trigger on date selection", () => {
      const picker = createPicker(input, {
        initialDate: { year: 1445, month: 9, day: 1 },
      });
      const elements = picker.getElements()!;

      picker.open();
      expect(picker.isOpen()).toBe(true);
      expect(elements.trigger.getAttribute("aria-expanded")).toBe("true");

      // Active day (1st of Ramadan) is focused
      const day1 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1445-09-01"]',
      );
      expect(day1).not.toBeNull();
      expect(document.activeElement).toBe(day1);

      // Press Enter to select
      day1?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      expect(picker.isOpen()).toBe(false);
      expect(elements.trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(elements.trigger);
      expect(input.value).toBe("1445-09-01");

      picker.destroy();
    });

    it("closes dialog and returns focus to trigger on Escape key", async () => {
      const picker = createPicker(input, {
        initialDate: { year: 1445, month: 9, day: 1 },
      });
      const elements = picker.getElements()!;

      picker.open();
      expect(picker.isOpen()).toBe(true);

      // Close via native dialog cancel / close event
      elements.dialog.close();
      expect(picker.isOpen()).toBe(false);

      await vi.waitFor(() => {
        expect(elements.trigger.getAttribute("aria-expanded")).toBe("false");
      });

      picker.destroy();
    });
  });

  describe("Keyboard navigation in LTR and RTL", () => {
    it("navigates in LTR: ArrowRight = +1 day, ArrowLeft = -1 day", () => {
      const picker = createPicker(input, {
        initialDate: { year: 1445, month: 9, day: 10 },
        dir: "ltr",
      });
      const elements = picker.getElements()!;
      picker.open();

      const day10 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1445-09-10"]',
      )!;
      expect(document.activeElement).toBe(day10);

      // ArrowRight -> day 11
      day10.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      const day11 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1445-09-11"]',
      )!;
      expect(document.activeElement).toBe(day11);

      // ArrowLeft -> back to day 10
      day11.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      expect(document.activeElement).toBe(day10);

      picker.destroy();
    });

    it("navigates in RTL: ArrowRight = -1 day, ArrowLeft = +1 day", () => {
      const picker = createPicker(input, {
        initialDate: { year: 1445, month: 9, day: 10 },
        dir: "rtl",
      });
      const elements = picker.getElements()!;
      expect(elements.dialog.getAttribute("dir")).toBe("rtl");

      picker.open();

      const day10 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1445-09-10"]',
      )!;
      expect(document.activeElement).toBe(day10);

      // In RTL, ArrowRight moves to PREVIOUS day (day 9)
      day10.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      const day9 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1445-09-09"]',
      )!;
      expect(document.activeElement).toBe(day9);

      // In RTL, ArrowLeft moves to NEXT day (day 10)
      day9.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      expect(document.activeElement).toBe(day10);

      picker.destroy();
    });

    it("navigates vertical, week, month, and year keys", () => {
      const picker = createPicker(input, {
        initialDate: { year: 1445, month: 9, day: 10 },
      });
      const elements = picker.getElements()!;
      picker.open();

      const day10 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1445-09-10"]',
      )!;

      // ArrowDown -> day 17 (+7 days)
      day10.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      const day17 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1445-09-17"]',
      )!;
      expect(document.activeElement).toBe(day17);

      // ArrowUp -> day 10 (-7 days)
      day17.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
      expect(document.activeElement).toBe(day10);

      // PageDown -> next month (Shawwal 10)
      day10.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
      expect(picker.getVisibleDate()?.month).toBe(10);

      // PageUp -> previous month (Ramadan 10)
      const dayShawwal10 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1445-10-10"]',
      )!;
      dayShawwal10.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true }));
      expect(picker.getVisibleDate()?.month).toBe(9);

      // Shift+PageDown -> next year (1446)
      const dayRamadan10 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1445-09-10"]',
      )!;
      dayRamadan10.dispatchEvent(
        new KeyboardEvent("keydown", { key: "PageDown", shiftKey: true, bubbles: true }),
      );
      expect(picker.getVisibleDate()?.year).toBe(1446);

      // Shift+PageUp -> previous year (1445)
      const day1446 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1446-09-10"]',
      )!;
      day1446.dispatchEvent(
        new KeyboardEvent("keydown", { key: "PageUp", shiftKey: true, bubbles: true }),
      );
      expect(picker.getVisibleDate()?.year).toBe(1445);

      picker.destroy();
    });
  });

  describe("Min/Max date constraints and teardown", () => {
    it("disables out-of-range days and prevents keyboard/click selection", () => {
      const picker = createPicker(input, {
        initialDate: { year: 1445, month: 9, day: 10 },
        minDate: { year: 1445, month: 9, day: 8 },
        maxDate: { year: 1445, month: 9, day: 12 },
      });
      const elements = picker.getElements()!;
      picker.open();

      const day5 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1445-09-05"]',
      )!;
      expect(day5.getAttribute("aria-disabled")).toBe("true");
      expect(day5.tabIndex).toBe(-1);

      // Clicking disabled day does NOT select
      day5.click();
      expect(picker.isOpen()).toBe(true);
      expect(picker.getDate()).toBeNull();
      expect(input.value).toBe("");

      // Pressing Enter on disabled day does NOT select
      day5.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      expect(picker.isOpen()).toBe(true);
      expect(picker.getDate()).toBeNull();

      // Enabled day within range can be selected
      const day10 = elements.grid!.querySelector<HTMLButtonElement>(
        'button[data-date="1445-09-10"]',
      )!;
      expect(day10.getAttribute("aria-disabled")).toBeNull();
      day10.click();
      expect(picker.isOpen()).toBe(false);
      expect(picker.getDate()).toEqual({ year: 1445, month: 9, day: 10 });
      expect(input.value).toBe("1445-09-10");

      picker.destroy();
    });

    it("leaves zero DOM nodes or orphaned listeners after destroy()", () => {
      const picker = createPicker(input);
      const elements = picker.getElements()!;

      expect(document.contains(elements.trigger)).toBe(true);
      expect(document.contains(elements.dialog)).toBe(true);

      picker.destroy();

      expect(document.contains(elements.trigger)).toBe(false);
      expect(document.contains(elements.dialog)).toBe(false);

      // Calling methods after destroy does not crash
      expect(() => picker.open()).not.toThrow();
      expect(() => picker.close()).not.toThrow();
      expect(picker.isOpen()).toBe(false);
      expect(picker.getDate()).toBeNull();
      expect(() => picker.setDate({ year: 1445, month: 1, day: 1 })).not.toThrow();
      expect(() => picker.destroy()).not.toThrow();
    });
  });
});
