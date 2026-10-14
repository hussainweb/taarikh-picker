import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialogShell } from "../../src/ui/dialog.js";
import type { PlainDate } from "../../src/engine/index.js";
import { fatimidAstronomicalCalendar, today } from "../../src/engine/index.js";
import { resetUniqueIdCounter } from "../../src/ui/dom.js";

describe("Input binding, typed validation, and events (tp-il8.3.3)", () => {
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

  describe("Initial value parsing", () => {
    it("parses valid initial input value, selects it, and opens on that month", () => {
      input.value = "1445-09-15";
      const shell = new DialogShell(input);

      expect(shell.getSelectedDate()).toEqual({ year: 1445, month: 9, day: 15 });
      expect(shell.getVisibleDate()).toEqual({ year: 1445, month: 9, day: 15 });
      expect(input.value).toBe("1445-09-15");
      expect(input.getAttribute("aria-invalid")).toBeNull();
      expect(input.validationMessage).toBe("");

      const elements = shell.getElements();
      expect(elements.selectYear.value).toBe("1445");
      expect(elements.selectMonth.value).toBe("9");
      expect(elements.liveRegion.textContent).toBe("Ramadan al-Moazzam 1445");
    });

    it("defaults to today or initialDate when input.value is empty", () => {
      input.value = "";
      const customInitial: PlainDate = { year: 1448, month: 4, day: 1 };
      const shell = new DialogShell(input, { initialDate: customInitial });

      expect(shell.getSelectedDate()).toBeUndefined();
      expect(shell.getVisibleDate()).toEqual(customInitial);
      expect(input.getAttribute("aria-invalid")).toBeNull();
    });

    it("marks input invalid on construction if initial value is malformed or invalid date", () => {
      input.value = "not-a-date";
      const shell = new DialogShell(input);

      expect(shell.getSelectedDate()).toBeUndefined();
      expect(input.value).toBe("not-a-date");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(input.validationMessage).toBe("Please enter a valid date");
    });

    it("marks input invalid on construction if initial value is out of min/max bounds", () => {
      input.value = "1440-01-01";
      const shell = new DialogShell(input, {
        minDate: { year: 1445, month: 1, day: 1 },
      });

      expect(shell.getSelectedDate()).toBeUndefined();
      expect(input.value).toBe("1440-01-01");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(input.validationMessage).toBe("Date is out of range");
    });
  });

  describe("Typed input validation on change", () => {
    it("accepts valid typed date, updates selected/visible date, and fires taarikh:change", () => {
      const shell = new DialogShell(input);
      const onTaarikhChange = vi.fn();
      input.addEventListener("taarikh:change", onTaarikhChange);

      input.value = "1446-12-29";
      input.dispatchEvent(new Event("change"));

      expect(input.getAttribute("aria-invalid")).toBeNull();
      expect(input.validationMessage).toBe("");
      expect(shell.getSelectedDate()).toEqual({ year: 1446, month: 12, day: 29 });
      expect(shell.getVisibleDate()).toEqual({ year: 1446, month: 12, day: 29 });

      expect(onTaarikhChange).toHaveBeenCalledTimes(1);
      const detail = onTaarikhChange.mock.calls[0]![0].detail;
      expect(detail).toEqual({
        date: { year: 1446, month: 12, day: 29 },
        value: "1446-12-29",
      });
    });

    it("accepts years with 1-4 digits per the relaxed typed input contract", () => {
      const shell = new DialogShell(input);
      const onTaarikhChange = vi.fn();
      input.addEventListener("taarikh:change", onTaarikhChange);

      input.value = "1-01-01";
      input.dispatchEvent(new Event("change"));

      expect(input.getAttribute("aria-invalid")).toBeNull();
      expect(input.validationMessage).toBe("");
      expect(shell.getSelectedDate()).toEqual({ year: 1, month: 1, day: 1 });
      expect(onTaarikhChange).toHaveBeenCalledTimes(1);
    });

    it("rejects invalid date, sets aria-invalid and custom validity, and never rewrites input", () => {
      const shell = new DialogShell(input);
      const onTaarikhChange = vi.fn();
      input.addEventListener("taarikh:change", onTaarikhChange);

      // In Fatimid calendar, month 2 (Safar) has 29 days (even month)
      input.value = "1445-02-31";
      input.dispatchEvent(new Event("change"));

      expect(shell.getSelectedDate()).toBeUndefined();
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(input.validationMessage).toBe("Please enter a valid date");
      // Must NOT rewrite what the user typed
      expect(input.value).toBe("1445-02-31");
      expect(onTaarikhChange).not.toHaveBeenCalled();
    });

    it("rejects date outside minDate and maxDate bounds", () => {
      const shell = new DialogShell(input, {
        minDate: { year: 1445, month: 5, day: 10 },
        maxDate: { year: 1445, month: 8, day: 20 },
      });

      // Before minDate
      input.value = "1445-05-09";
      input.dispatchEvent(new Event("change"));
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(input.validationMessage).toBe("Date is out of range");
      expect(input.value).toBe("1445-05-09");

      // After maxDate
      input.value = "1445-08-21";
      input.dispatchEvent(new Event("change"));
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(input.validationMessage).toBe("Date is out of range");

      // Within range clears error
      input.value = "1445-06-01";
      input.dispatchEvent(new Event("change"));
      expect(input.getAttribute("aria-invalid")).toBeNull();
      expect(input.validationMessage).toBe("");
      expect(shell.getSelectedDate()).toEqual({ year: 1445, month: 6, day: 1 });
    });

    it("clearing typed text resets selection and fires taarikh:change with null", () => {
      input.value = "1445-01-01";
      const shell = new DialogShell(input);
      const onTaarikhChange = vi.fn();
      input.addEventListener("taarikh:change", onTaarikhChange);

      input.value = "";
      input.dispatchEvent(new Event("change"));

      expect(input.getAttribute("aria-invalid")).toBeNull();
      expect(input.validationMessage).toBe("");
      expect(shell.getSelectedDate()).toBeUndefined();
      expect(onTaarikhChange).toHaveBeenCalledTimes(1);
      expect(onTaarikhChange.mock.calls[0]![0].detail).toEqual({
        date: null,
        value: "",
      });
    });
  });

  describe("Selection, events, Today, and Clear", () => {
    it("selectDate writes formatted zero-padded value, dispatches input, change, and taarikh:change", () => {
      const shell = new DialogShell(input);
      const onInput = vi.fn();
      const onChange = vi.fn();
      const onTaarikhChange = vi.fn();

      input.addEventListener("input", onInput);
      input.addEventListener("change", onChange);
      input.addEventListener("taarikh:change", onTaarikhChange);

      shell.open();
      expect(shell.isOpen()).toBe(true);

      const targetDate: PlainDate = { year: 1445, month: 9, day: 5 };
      shell.selectDate(targetDate);

      expect(input.value).toBe("1445-09-05");
      expect(input.getAttribute("aria-invalid")).toBeNull();
      expect(shell.getSelectedDate()).toEqual(targetDate);

      // Bubbling events
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onTaarikhChange).toHaveBeenCalledTimes(1);
      expect(onTaarikhChange.mock.calls[0]![0].detail).toEqual({
        date: targetDate,
        value: "1445-09-05",
      });

      // Dialog is closed
      expect(shell.isOpen()).toBe(false);
    });

    it("Today button selects today, writes value, dispatches events, and closes dialog", () => {
      const shell = new DialogShell(input);
      const onInput = vi.fn();
      const onChange = vi.fn();
      const onTaarikhChange = vi.fn();

      input.addEventListener("input", onInput);
      input.addEventListener("change", onChange);
      input.addEventListener("taarikh:change", onTaarikhChange);

      const elements = shell.getElements();
      shell.open();
      elements.btnToday.click();

      const expectedToday = today(fatimidAstronomicalCalendar);
      expect(shell.getSelectedDate()).toEqual(expectedToday);
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onTaarikhChange).toHaveBeenCalledTimes(1);
      expect(shell.isOpen()).toBe(false);
    });

    it("Clear button empties input, clears selection, and fires events", () => {
      input.value = "1445-01-01";
      const shell = new DialogShell(input);
      const onInput = vi.fn();
      const onChange = vi.fn();
      const onTaarikhChange = vi.fn();

      input.addEventListener("input", onInput);
      input.addEventListener("change", onChange);
      input.addEventListener("taarikh:change", onTaarikhChange);

      const elements = shell.getElements();
      elements.btnClear.click();

      expect(input.value).toBe("");
      expect(shell.getSelectedDate()).toBeUndefined();
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onTaarikhChange).toHaveBeenCalledTimes(1);
      expect(onTaarikhChange.mock.calls[0]![0].detail).toEqual({
        date: null,
        value: "",
      });
    });
  });

  describe("Year and Month select bounds and synchronization (tp-il8.3.10)", () => {
    it("keeps year select in sync when navigating 60 years forward and backward", () => {
      const shell = new DialogShell(input, {
        initialDate: { year: 1445, month: 1, day: 1 },
      });
      const elements = shell.getElements();

      expect(elements.selectYear.value).toBe("1445");

      // Navigate 60 years forward (1505)
      shell.setVisibleDate({ year: 1505, month: 1, day: 1 });
      expect(elements.selectYear.value).toBe("1505");
      expect(elements.selectYear.querySelector('option[value="1505"]')).not.toBeNull();

      // Navigate 60 years backward from initial (1385)
      shell.setVisibleDate({ year: 1385, month: 1, day: 1 });
      expect(elements.selectYear.value).toBe("1385");
      expect(elements.selectYear.querySelector('option[value="1385"]')).not.toBeNull();
    });

    it("bounds month options at min/max year so selects cannot reach outside bounds", () => {
      const minDate: PlainDate = { year: 1445, month: 5, day: 10 };
      const maxDate: PlainDate = { year: 1447, month: 8, day: 20 };

      const shell = new DialogShell(input, {
        initialDate: { year: 1445, month: 5, day: 10 },
        minDate,
        maxDate,
      });
      const elements = shell.getElements();

      // At min year: month select options should start at 5 (Jumada al-Ula)
      const monthOptions1445 = Array.from(elements.selectMonth.options).map((o) =>
        parseInt(o.value, 10),
      );
      expect(monthOptions1445[0]).toBe(5);
      expect(monthOptions1445[monthOptions1445.length - 1]).toBe(12);

      // Switch to middle year 1446: month options are 1 to 12
      elements.selectYear.value = "1446";
      elements.selectYear.dispatchEvent(new Event("change"));
      const monthOptions1446 = Array.from(elements.selectMonth.options).map((o) =>
        parseInt(o.value, 10),
      );
      expect(monthOptions1446[0]).toBe(1);
      expect(monthOptions1446[monthOptions1446.length - 1]).toBe(12);

      // Select month 11 in 1446
      elements.selectMonth.value = "11";
      elements.selectMonth.dispatchEvent(new Event("change"));
      expect(shell.getVisibleDate().month).toBe(11);

      // Switch to max year 1447: month options are 1 to 8, month 11 is clamped to 8
      elements.selectYear.value = "1447";
      elements.selectYear.dispatchEvent(new Event("change"));
      const monthOptions1447 = Array.from(elements.selectMonth.options).map((o) =>
        parseInt(o.value, 10),
      );
      expect(monthOptions1447[0]).toBe(1);
      expect(monthOptions1447[monthOptions1447.length - 1]).toBe(8);
      expect(elements.selectMonth.value).toBe("8");
      expect(shell.getVisibleDate().month).toBe(8);
    });
  });
});
