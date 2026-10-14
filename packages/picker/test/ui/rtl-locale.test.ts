import { afterEach, beforeEach, describe, expect, it } from "vitest";
import axe from "axe-core";
import { createPicker } from "../../src/index.js";
import type { PickerLabels } from "../../src/index.js";
import { resetUniqueIdCounter } from "../../src/ui/dom.js";

describe("RTL support and Arabic localisation test suite (tp-il8.3.4)", () => {
  let form: HTMLFormElement;
  let label: HTMLLabelElement;
  let input: HTMLInputElement;

  const ARABIC_LABELS: PickerLabels = {
    chooseDate: "اختر التاريخ",
    trigger: "اختر التاريخ",
    previousMonth: "الشهر السابق",
    prev: "السابق",
    nextMonth: "الشهر التالي",
    next: "التالي",
    monthSelect: "اختر الشهر",
    yearSelect: "اختر السنة",
    today: "اليوم",
    clear: "مسح",
    close: "إغلاق",
    dialogTitle: "التقويم الهجري",
    invalidDate: "الرجاء إدخال تاريخ صحيح",
    outOfRange: "التاريخ خارج النطاق المحدد",
    months: {
      long: [
        "محرم الحرام",
        "صفر المظفر",
        "ربيع الأول",
        "ربيع الآخر",
        "جمادى الأولى",
        "جمادى الآخرة",
        "رجب الأصب",
        "شعبان الكريم",
        "رمضان المعظم",
        "شوال المكرم",
        "ذو القعدة الحرام",
        "ذو الحجة الحرام",
      ],
      short: [
        "محرم",
        "صفر",
        "ربيع ١",
        "ربيع ٢",
        "جمادى ١",
        "جمادى ٢",
        "رجب",
        "شعبان",
        "رمضان",
        "شوال",
        "ذو القعدة",
        "ذو الحجة",
      ],
    },
    weekdays: {
      long: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
      short: ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"],
      narrow: ["ح", "ن", "ث", "ر", "خ", "ج", "س"],
    },
  };

  beforeEach(() => {
    resetUniqueIdCounter();
    form = document.createElement("form");
    form.setAttribute("dir", "rtl");
    document.body.appendChild(form);

    label = document.createElement("label");
    label.htmlFor = "hijri-input";
    label.textContent = "التاريخ الهجري";
    form.appendChild(label);

    input = document.createElement("input");
    input.id = "hijri-input";
    input.name = "hijri";
    input.type = "text";
    form.appendChild(input);
  });

  afterEach(() => {
    form.remove();
    document.body.innerHTML = "";
  });

  it("renders RTL dialog with Arabic label pack and mirrored navigation controls", () => {
    const picker = createPicker(input, {
      locale: "ar-EG",
      labels: ARABIC_LABELS,
      initialDate: { year: 1445, month: 9, day: 15 },
    });

    const elements = picker.getElements()!;

    // Dialog has dir="rtl" inherited from ancestor form
    expect(elements.dialog.getAttribute("dir")).toBe("rtl");

    // Accessible titles and button labels in Arabic
    expect(elements.trigger.getAttribute("aria-label")).toBe("اختر التاريخ");
    expect(elements.title.textContent).toBe("التقويم الهجري");
    expect(elements.btnToday.textContent).toBe("اليوم");
    expect(elements.btnClear.textContent).toBe("مسح");
    expect(elements.btnPrev.textContent).toBe("السابق");
    expect(elements.btnPrev.getAttribute("aria-label")).toBe("الشهر السابق");
    expect(elements.btnNext.textContent).toBe("التالي");
    expect(elements.btnNext.getAttribute("aria-label")).toBe("الشهر التالي");

    // Selects and options
    expect(elements.selectMonth.getAttribute("aria-label")).toBe("اختر الشهر");
    expect(elements.selectYear.getAttribute("aria-label")).toBe("اختر السنة");

    // Month select uses custom Arabic month name
    expect(elements.selectMonth.options[8]?.textContent).toBe("رمضان المعظم");

    // Year select displays Eastern Arabic numerals while preserving ASCII value
    const year1445Opt = elements.selectYear.querySelector('option[value="1445"]');
    expect(year1445Opt).not.toBeNull();
    expect(year1445Opt?.textContent).toBe("١٤٤٥");
    expect(year1445Opt?.getAttribute("value")).toBe("1445");

    // Live region announces in Arabic
    expect(elements.liveRegion.textContent).toContain("رمضان المعظم");
    expect(elements.liveRegion.textContent).toContain("١٤٤٥");

    // Weekday column headers in Arabic (ar-EG default firstDay is Saturday / السبت)
    const headers = elements.dialog.querySelectorAll("th[role='columnheader']");
    expect(headers).toHaveLength(7);
    expect(headers[0]?.getAttribute("abbr")).toBe("السبت");
    expect(headers[0]?.textContent?.trim()).toBe("سبت");
    expect(headers[1]?.getAttribute("abbr")).toBe("الأحد");
    expect(headers[1]?.textContent?.trim()).toBe("أحد");

    picker.destroy();
  });

  it("respects firstDayOfWeek option (0 = Sunday) even in ar-EG locale", () => {
    const picker = createPicker(input, {
      locale: "ar-EG",
      labels: ARABIC_LABELS,
      firstDayOfWeek: 0,
      initialDate: { year: 1445, month: 9, day: 15 },
    });

    const elements = picker.getElements()!;
    const headers = elements.dialog.querySelectorAll("th[role='columnheader']");
    expect(headers[0]?.getAttribute("abbr")).toBe("الأحد");
    expect(headers[0]?.textContent?.trim()).toBe("أحد");
    expect(headers[6]?.getAttribute("abbr")).toBe("السبت");
    expect(headers[6]?.textContent?.trim()).toBe("سبت");

    picker.destroy();
  });

  it("mirrors arrow keys in RTL: Right arrow moves back 1 day, Left arrow moves forward 1 day", () => {
    const picker = createPicker(input, {
      locale: "ar-EG",
      labels: ARABIC_LABELS,
      initialDate: { year: 1445, month: 9, day: 15 },
    });

    picker.open();
    const elements = picker.getElements()!;
    const gridTable = elements.dialog.querySelector(".tp-grid-table") as HTMLTableElement;

    // Initially focused on day 15
    const day15Btn = gridTable.querySelector(
      '.tp-day-btn[data-date="1445-09-15"]',
    ) as HTMLButtonElement;
    expect(day15Btn.tabIndex).toBe(0);

    // In RTL, ArrowRight moves backward (-1 day) to day 14
    gridTable.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    const day14Btn = gridTable.querySelector(
      '.tp-day-btn[data-date="1445-09-14"]',
    ) as HTMLButtonElement;
    expect(day14Btn.tabIndex).toBe(0);
    expect(day15Btn.tabIndex).toBe(-1);

    // In RTL, ArrowLeft moves forward (+1 day) back to day 15
    gridTable.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(day15Btn.tabIndex).toBe(0);

    // ArrowLeft again moves forward (+1 day) to day 16
    gridTable.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    const day16Btn = gridTable.querySelector(
      '.tp-day-btn[data-date="1445-09-16"]',
    ) as HTMLButtonElement;
    expect(day16Btn.tabIndex).toBe(0);

    // ArrowUp moves backward (-7 days) to day 9
    gridTable.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    const day9Btn = gridTable.querySelector(
      '.tp-day-btn[data-date="1445-09-09"]',
    ) as HTMLButtonElement;
    expect(day9Btn.tabIndex).toBe(0);

    // ArrowDown moves forward (+7 days) to day 16
    gridTable.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(day16Btn.tabIndex).toBe(0);

    picker.destroy();
  });

  it("strictly preserves ASCII YYYY-MM-DD value contract when selecting a date in RTL", () => {
    const picker = createPicker(input, {
      locale: "ar-EG",
      labels: ARABIC_LABELS,
      initialDate: { year: 1445, month: 9, day: 1 },
    });

    picker.open();
    const elements = picker.getElements()!;
    const day27Btn = elements.dialog.querySelector(
      '.tp-day-btn[data-date="1445-09-27"]',
    ) as HTMLButtonElement;

    day27Btn.click();

    // Value in input must be ASCII digits YYYY-MM-DD per value-contract-drupal memory
    expect(input.value).toBe("1445-09-27");
    expect(picker.getDate()).toEqual({ year: 1445, month: 9, day: 27 });

    picker.destroy();
  });

  it("passes axe-core accessibility checks with 0 violations in RTL mode", async () => {
    const picker = createPicker(input, {
      locale: "ar-EG",
      labels: ARABIC_LABELS,
      initialDate: { year: 1445, month: 9, day: 1 },
    });

    picker.open();

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
