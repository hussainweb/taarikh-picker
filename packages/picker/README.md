# @taarikh/picker

A lightweight, accessible Hijri calendar date picker with zero third-party dependencies, built with vanilla TypeScript and modern web standards.

[![npm version](https://img.shields.io/npm/v/@taarikh/picker.svg)](https://www.npmjs.com/package/@taarikh/picker)
[![CI](https://github.com/hussainweb/taarikh-picker/actions/workflows/ci.yml/badge.svg)](https://github.com/hussainweb/taarikh-picker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/hussainweb/taarikh-picker/blob/main/LICENSE)

---

## Features

- **Zero External Dependencies**: Pure vanilla TypeScript compiled to ESM and standalone IIFE bundles (< 13 KB gzipped including stylesheet). No jQuery, no third-party runtime dependencies.
- **Built on `@taarikh/core`**: Powered by headless [`@taarikh/core`](https://www.npmjs.com/package/@taarikh/core) for arithmetic, Julian Day conversions, and formatting. Re-exports the complete `@taarikh/core` surface for convenience.
- **Fatimid Astronomical Hijri Calendar**: Accurate astronomical calculation based on the Fatimid tabular calendar, with decoupled Julian Day Number (JDN) conversions matching `hussainweb/date-converter`.
- **WCAG 2.2 AA Accessible**: Full compliance with the [WAI-ARIA APG Date Picker Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/), native `<dialog>` top-layer modality, roving `tabindex`, and polite live-region announcements. 0 axe-core violations.
- **Bidirectional & RTL Layout**: Automatic or manual direction detection (`ltr`, `rtl`, `auto`). Mirrors layout via CSS logical properties, mirrors navigation glyphs (`‹`/`›`), and mirrors keyboard arrow keys.
- **Comprehensive Localization**: Month names, weekday headers, button labels, and live-region announcements are fully customizable via options or auto-derived from `Intl`.
- **Strict Separation of Value and Display**: Submitted form inputs always receive standard, zero-padded ASCII `YYYY-MM-DD` strings (e.g. `1446-09-01`), while UI headers, dropdowns, and announcements use localized numerals and script separators.
- **Modern CSS Architecture**: Isolated component selectors (`.tp-dialog .tp-*`) that resist accidental host theme resets, paired with zero-specificity `--tp-*` design tokens, CSS Anchor Positioning (centered modal fallback), light/dark mode via `light-dark()`, high-contrast (`forced-colors`), and mobile bottom-sheet styling.
- **Dual Distribution**: Available as `@taarikh/picker` on npm and `hussainweb/taarikh-picker` on Packagist for seamless integration into Drupal and modern web stacks.

---

## Installation

### Via npm (ESM + Bundler)

```bash
npm install @taarikh/picker
```

Import JavaScript and CSS into your project:

```ts
import { createPicker } from "@taarikh/picker";
import "@taarikh/picker/style.css";
```

### Via IIFE (Direct Script Tag)

Compiled standalone assets are provided in `dist/`:

```html
<!-- Stylesheet -->
<link rel="stylesheet" href="/libraries/taarikh-picker/dist/style.css" />

<!-- Standalone IIFE (exposes global TaarikhPicker object) -->
<script src="/libraries/taarikh-picker/dist/index.iife.js"></script>
```

### Via Composer (Drupal Library / Packagist)

For Drupal sites using Composer with `composer/installers`, install directly into `libraries/taarikh-picker`:

```bash
composer require hussainweb/taarikh-picker
```

---

## Quick Start

Given an HTML `<input>` element:

```html
<label for="hijri-date">Hijri Date</label>
<input type="text" id="hijri-date" name="hijri_date" placeholder="YYYY-MM-DD" />
```

Initialize the picker:

```ts
import { createPicker } from "@taarikh/picker";
import "@taarikh/picker/style.css";

const input = document.querySelector<HTMLInputElement>("#hijri-date")!;
const picker = createPicker(input, {
  locale: "ar",
  dir: "auto",
});
```

With the IIFE global:

```html
<script>
  const input = document.getElementById("hijri-date");
  const picker = TaarikhPicker.createPicker(input, {
    locale: "ar",
  });
</script>
```

---

## API Reference

### `createPicker(input, options?)`

Factory function that creates and returns a `TaarikhPicker` instance.

```ts
function createPicker(input: HTMLInputElement, options?: TaarikhPickerOptions): TaarikhPicker;
```

### `TaarikhPickerOptions`

| Option                         | Type                             | Default                       | Description                                                                                                            |
| ------------------------------ | -------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `engine`                       | `CalendarEngine`                 | `fatimidAstronomicalCalendar` | Pluggable calendar engine implementing Julian Day conversion.                                                          |
| `dir`                          | `"ltr" \| "rtl" \| "auto"`       | `"auto"`                      | Text direction. `"auto"` detects from `input.closest('[dir]')`, computed style, or `document.dir`.                     |
| `locale`                       | `string`                         | `undefined` (browser default) | BCP 47 locale tag (e.g. `'ar'`, `'ar-EG'`, `'fa'`, `'ur'`, `'en'`) used for weekday resolution and numeral formatting. |
| `firstDayOfWeek`               | `number` (0–6)                   | Derived from `Intl.Locale`    | First day of week, where `0` = Sunday, `1` = Monday, ..., `6` = Saturday.                                              |
| `initialDate`                  | `PlainDate`                      | `undefined` (today)           | Date to focus and display on first open when the input is empty.                                                       |
| `selectedDate`                 | `PlainDate`                      | Parsed from input value       | Initially selected date.                                                                                               |
| `minDate`                      | `PlainDate`                      | `undefined`                   | Earliest selectable date. Earlier dates and previous months/years are disabled.                                        |
| `maxDate`                      | `PlainDate`                      | `undefined`                   | Latest selectable date. Later dates and next months/years are disabled.                                                |
| `valueFormat` / `valuePattern` | `string`                         | `"YYYY-MM-DD"`                | Formatting pattern for submitted input value.                                                                          |
| `labels`                       | `PickerLabels`                   | `DEFAULT_LABELS`              | Custom string overrides for buttons, dialog, months, weekdays, and announcements.                                      |
| `idPrefix`                     | `string`                         | `"tp"`                        | Prefix used for generated dialog element IDs.                                                                          |
| `onSelect`                     | `(date: PlainDate) => void`      | `undefined`                   | Callback fired when a date is selected.                                                                                |
| `onOpen`                       | `() => void`                     | `undefined`                   | Callback fired when the dialog opens.                                                                                  |
| `onClose`                      | `() => void`                     | `undefined`                   | Callback fired when the dialog closes.                                                                                 |
| `onMonthChange`                | `(date: PlainDate) => void`      | `undefined`                   | Callback fired when visible month/year changes.                                                                        |
| `onToday`                      | `(todayDate: PlainDate) => void` | `undefined`                   | Callback fired when the Today button is clicked.                                                                       |
| `onClear`                      | `() => void`                     | `undefined`                   | Callback fired when the Clear button is clicked.                                                                       |

### Instance Methods

A `TaarikhPicker` instance returned by `createPicker()` exposes:

```ts
class TaarikhPicker {
  /** Open the datepicker dialog and focus the active day */
  open(): void;

  /** Close the dialog and return focus to the trigger button */
  close(): void;

  /** Check whether the dialog is currently open */
  isOpen(): boolean;

  /** Get the selected PlainDate, or null if input is empty */
  getDate(): PlainDate | null;

  /** Programmatically set the selected date (updates input value and calendar state) */
  setDate(date: PlainDate | null | undefined): void;

  /** Get the current visible month and year in the dialog */
  getVisibleDate(): PlainDate | undefined;

  /** Navigate the dialog to a specific month/year */
  setVisibleDate(date: PlainDate): void;

  /** Get the underlying HTMLInputElement */
  getInput(): HTMLInputElement;

  /** Get references to created DOM elements (trigger, dialog, buttons, selects) */
  getElements(): DialogElements | undefined;

  /** Destroy the picker, abort event listeners, and remove dialog DOM nodes */
  destroy(): void;

  /** Explicit Resource Management disposable method */
  [Symbol.dispose](): void;
}
```

### Explicit Resource Management (`using`)

In TypeScript / JavaScript environments supporting `Symbol.dispose`:

```ts
{
  using picker = createPicker(input);
  // Picker is automatically destroyed and listeners detached at block exit
}
```

### Events

Selecting a date, clicking **Today**, or clicking **Clear** dispatches:

1. Standard native `input` event (bubbles).
2. Standard native `change` event (bubbles).
3. Custom `taarikh:change` event (bubbles):

```ts
input.addEventListener("taarikh:change", (event: CustomEvent) => {
  const { date, value } = event.detail;
  console.log("Selected Hijri date:", date); // { year: 1446, month: 9, day: 1 } or null
  console.log("Submitted ASCII value:", value); // "1446-09-01" or ""
});
```

---

## Styling & Design Tokens

The stylesheet is designed so that generic host theme rules (such as `table`, `th`, `td`, `.form-item button`, or `.form-item select` in CMS themes like Drupal Claro/Gin) cannot accidentally break the picker's layout, while intentional customization remains straightforward:

1. **CSS Custom Properties (`(0, 0, 0)` specificity)**: Declared on `:where(:root, :host)`, so setting `--tp-*` tokens on `:root`, a form wrapper, or `.tp-dialog` always takes precedence regardless of stylesheet load order.
2. **Flat Component Selectors (`(0, 2, 0)` specificity)**: Internal elements use uniform `.tp-dialog .tp-<element>` selectors (and `.tp-btn-trigger.tp-btn-trigger` for the trigger button). To override a rule directly, target `.tp-dialog .tp-<element>` in a stylesheet loaded after `@taarikh/picker/style.css`, or scope with a wrapper class (e.g., `.my-form .tp-dialog .tp-day-btn`).
3. **Optional Cascade Layering**: If your application manages styles via CSS Cascade Layers, import the stylesheet into your desired layer:
   ```css
   @import "@taarikh/picker/style.css" layer(components);
   ```

### CSS Custom Properties (`--tp-*`)

Override any of the design tokens on `:root`, a form container, or `.tp-dialog`:

```css
:root {
  /* Colors */
  --tp-accent: #1a73e8; /* Primary action color */
  --tp-selected-text: #ffffff; /* Selected day text color */
  --tp-bg: light-dark(#ffffff, #1e1e1e); /* Dialog background */
  --tp-text: light-dark(#202124, #e8eaed); /* Main text color */
  --tp-text-muted: light-dark(#5f6368, #9aa0a6); /* Weekday headers & secondary text */
  --tp-border-color: light-dark(#dadce0, #3c4043);
  --tp-border: 1px solid var(--tp-border-color);
  --tp-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

  /* Controls */
  --tp-btn-bg: light-dark(#f8f9fa, #2a2b2e);
  --tp-btn-hover-bg: light-dark(#f1f3f4, #35363a);
  --tp-btn-text: var(--tp-text);
  --tp-focus-ring: 2px solid var(--tp-accent);

  /* Dimensions & Typography */
  --tp-font-family: system-ui, -apple-system, sans-serif;
  --tp-font-size: 0.9375rem;
  --tp-radius: 8px;
  --tp-cell-size: 32px; /* Day cell size (enlarges to 44px on touch) */
  --tp-anchor-offset: 4px; /* Gap between input and anchored dialog */
  --tp-dialog-width: min(92vw, 350px); /* Modal dialog width */
}
```

---

## Accessibility & Keyboard Navigation

The picker adheres strictly to the **WAI-ARIA APG Date Picker Dialog** specification:

- The calendar table has `role="grid"` and `aria-labelledby` pointing to the dialog header.
- Calendar cells use `role="gridcell"`, with selected states declared on the cell via `aria-selected="true"`.
- Days outside `minDate`/`maxDate` bounds have `aria-disabled="true"` and `tabindex="-1"`.
- Focus is trapped within the native `<dialog>` modal while open and returned to the trigger button upon dismissal.

### Keyboard Shortcuts

| Key                | Action                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `ArrowRight`       | Move focus to the next day in LTR (previous day in RTL).                                                |
| `ArrowLeft`        | Move focus to the previous day in LTR (next day in RTL).                                                |
| `ArrowDown`        | Move focus to the same weekday in the next week (+7 days).                                              |
| `ArrowUp`          | Move focus to the same weekday in the previous week (-7 days).                                          |
| `Home`             | Move focus to the first day of the current week.                                                        |
| `End`              | Move focus to the last day of the current week.                                                         |
| `PageDown`         | Navigate to the same day in the next month.                                                             |
| `PageUp`           | Navigate to the same day in the previous month.                                                         |
| `Shift + PageDown` | Navigate to the same day in the next year.                                                              |
| `Shift + PageUp`   | Navigate to the same day in the previous year.                                                          |
| `Enter` / `Space`  | Select the focused day, write to input, and close dialog.                                               |
| `Escape`           | Dismiss dialog without changing date; return focus to trigger button.                                   |
| `Tab`              | Cycle forward through interactive controls within dialog (Prev, Month, Year, Next, Grid, Today, Clear). |
| `Shift + Tab`      | Cycle backward through interactive controls within dialog.                                              |

---

## Related Packages

- [`@taarikh/core`](https://www.npmjs.com/package/@taarikh/core): Pure headless calendar arithmetic, Fatimid engine, and formatting without DOM dependencies.

---

## License

MIT © [Hussain Abbas](https://github.com/hussainweb)
