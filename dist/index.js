import { DEFAULT_MONTH_LABELS, DEFAULT_MONTH_LABELS as DEFAULT_MONTH_LABELS$1, FATIMID_MONTH_NAMES, FATIMID_MONTH_NAMES_SHORT, FatimidAstronomicalCalendar, addDays, addDays as addDays$1, addMonths, addMonths as addMonths$1, addYears, addYears as addYears$1, clearFormatterCache, compareDates, compareDates as compareDates$1, fatimidAstronomicalCalendar, fatimidAstronomicalCalendar as fatimidAstronomicalCalendar$1, formatDayAriaLabel, formatDayAriaLabel as formatDayAriaLabel$1, formatDisplay, formatMonthHeading, formatMonthHeading as formatMonthHeading$1, formatValue, formatValue as formatValue$1, formatYear, formatYear as formatYear$1, getDateTimeFormatter, getMonthName, getMonthName as getMonthName$1, getNumberFormatter, getWeekdayNames, getWeekdayNames as getWeekdayNames$1, gregorianToJulianDay, inferDateOrder, isAfter, isAfter as isAfter$1, isArabicScriptLocale, isBefore, isBefore as isBefore$1, isSameDay, isSameDay as isSameDay$1, parseValue, parseValue as parseValue$1, today, today as today$1, weekday, weekday as weekday$1, weekdayFromJdn } from "@taarikh/core";
//#region src/ui/dom.ts
let idCounter = 0;
/**
* Generate a sequential unique identifier.
*/
function nextUniqueId(prefix = "tp") {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}
/**
* Default resolved labels for the datepicker UI.
*/
const DEFAULT_LABELS = {
	chooseDate: "Choose date",
	previousMonth: "Previous month",
	prev: "‹",
	nextMonth: "Next month",
	next: "›",
	monthSelect: "Select month",
	yearSelect: "Select year",
	today: "Today",
	clear: "Clear",
	close: "Close",
	dialogTitle: "Choose date",
	months: DEFAULT_MONTH_LABELS$1,
	invalidDate: "Please enter a valid date",
	outOfRange: "Date is out of range"
};
/**
* Inline SVG calendar icon for the trigger button.
*/
const CALENDAR_SVG_ICON = "<svg class=\"tp-icon-calendar\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"></line><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"></line><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"></line></svg>";
//#endregion
//#region src/ui/grid.ts
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
var MonthGrid = class {
	options;
	engine;
	table;
	thead;
	tbody;
	abortController = new AbortController();
	dayButtons = /* @__PURE__ */ new Map();
	visibleDate;
	selectedDate;
	focusedDate;
	minDate;
	maxDate;
	firstDayOfWeek;
	isRtl;
	constructor(options) {
		this.options = options;
		this.engine = options.calendarEngine;
		this.visibleDate = options.visibleDate;
		this.selectedDate = options.selectedDate;
		this.minDate = options.minDate;
		this.maxDate = options.maxDate;
		this.firstDayOfWeek = (options.firstDayOfWeek ?? 0) % 7;
		this.isRtl = Boolean(options.isRtl);
		this.focusedDate = this.computeInitialFocusedDate(this.visibleDate);
		this.table = document.createElement("table");
		this.table.className = "tp-grid-table";
		this.table.setAttribute("role", "grid");
		if (options.labelledBy) this.table.setAttribute("aria-labelledby", options.labelledBy);
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
	getElement() {
		return this.table;
	}
	getVisibleDate() {
		return this.visibleDate;
	}
	getFocusedDate() {
		return this.focusedDate;
	}
	getSelectedDate() {
		return this.selectedDate;
	}
	setSelectedDate(date) {
		this.selectedDate = date;
		this.updateSelectedState();
	}
	setMinDate(minDate) {
		this.minDate = minDate;
		this.renderBody();
	}
	setMaxDate(maxDate) {
		this.maxDate = maxDate;
		this.renderBody();
	}
	setVisibleDate(date, focusDay) {
		this.visibleDate = date;
		const daysInMonth = this.engine.daysInMonth(date.year, date.month);
		const day = focusDay !== void 0 ? Math.max(1, Math.min(focusDay, daysInMonth)) : void 0;
		if (day !== void 0) this.focusedDate = {
			year: date.year,
			month: date.month,
			day
		};
		else this.focusedDate = this.computeInitialFocusedDate(date);
		this.renderBody();
	}
	focusActiveDay() {
		const btn = this.dayButtons.get(this.focusedDate.day);
		if (btn) btn.focus();
	}
	isDateDisabled(date) {
		if (this.minDate && compareDates$1(date, this.minDate) < 0) return true;
		if (this.maxDate && compareDates$1(date, this.maxDate) > 0) return true;
		return false;
	}
	destroy() {
		this.abortController.abort();
		this.dayButtons.clear();
		this.table.remove();
	}
	computeInitialFocusedDate(monthDate) {
		const daysInMonth = this.engine.daysInMonth(monthDate.year, monthDate.month);
		if (this.selectedDate && this.selectedDate.year === monthDate.year && this.selectedDate.month === monthDate.month) {
			const day = Math.max(1, Math.min(this.selectedDate.day, daysInMonth));
			return {
				year: monthDate.year,
				month: monthDate.month,
				day
			};
		}
		const todayDate = today$1(this.engine);
		if (todayDate.year === monthDate.year && todayDate.month === monthDate.month) {
			const day = Math.max(1, Math.min(todayDate.day, daysInMonth));
			return {
				year: monthDate.year,
				month: monthDate.month,
				day
			};
		}
		const day = Math.max(1, Math.min(monthDate.day || 1, daysInMonth));
		return {
			year: monthDate.year,
			month: monthDate.month,
			day
		};
	}
	renderHeaders() {
		this.thead.replaceChildren();
		const row = document.createElement("tr");
		row.className = "tp-grid-head-row";
		row.setAttribute("role", "row");
		const shortNames = getWeekdayNames$1(this.options.locale, "short", this.firstDayOfWeek, this.options.labels?.weekdays);
		const longNames = getWeekdayNames$1(this.options.locale, "long", this.firstDayOfWeek, this.options.labels?.weekdays);
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
	renderBody() {
		this.tbody.replaceChildren();
		this.dayButtons.clear();
		const year = this.visibleDate.year;
		const month = this.visibleDate.month;
		const daysInMonth = this.engine.daysInMonth(year, month);
		const todayDate = today$1(this.engine);
		const leadingEmptyCells = ((weekday$1({
			year,
			month,
			day: 1
		}, this.engine) - this.firstDayOfWeek) % 7 + 7) % 7;
		let currentRow = document.createElement("tr");
		currentRow.className = "tp-grid-row";
		currentRow.setAttribute("role", "row");
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
			const date = {
				year,
				month,
				day
			};
			const td = document.createElement("td");
			td.className = "tp-grid-cell";
			td.setAttribute("role", "gridcell");
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "tp-day-btn";
			btn.textContent = String(day);
			btn.dataset.date = formatValue$1(date);
			const ariaLabel = formatDayAriaLabel$1(date, this.engine, this.options.locale, this.options.labels?.months, this.options.labels?.weekdays);
			btn.setAttribute("aria-label", ariaLabel);
			const isSelected = this.selectedDate !== void 0 && isSameDay$1(date, this.selectedDate);
			td.setAttribute("aria-selected", isSelected ? "true" : "false");
			btn.dataset.selected = isSelected ? "true" : "false";
			if (isSameDay$1(date, todayDate)) btn.setAttribute("aria-current", "date");
			if (this.isDateDisabled(date)) {
				btn.setAttribute("aria-disabled", "true");
				btn.classList.add("tp-day-disabled");
			}
			if (day === this.focusedDate.day) btn.tabIndex = 0;
			else btn.tabIndex = -1;
			this.dayButtons.set(day, btn);
			td.appendChild(btn);
			currentRow.appendChild(td);
			colCount++;
		}
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
	updateSelectedState() {
		for (const [day, btn] of this.dayButtons.entries()) {
			const date = {
				year: this.visibleDate.year,
				month: this.visibleDate.month,
				day
			};
			const isSelected = this.selectedDate !== void 0 && isSameDay$1(date, this.selectedDate);
			btn.dataset.selected = isSelected ? "true" : "false";
			const cell = btn.parentElement;
			if (cell) cell.setAttribute("aria-selected", isSelected ? "true" : "false");
		}
	}
	updateFocusedDay(newDay) {
		const daysInMonth = this.engine.daysInMonth(this.visibleDate.year, this.visibleDate.month);
		const clampedDay = Math.max(1, Math.min(newDay, daysInMonth));
		const oldBtn = this.dayButtons.get(this.focusedDate.day);
		if (oldBtn) oldBtn.tabIndex = -1;
		this.focusedDate = {
			year: this.visibleDate.year,
			month: this.visibleDate.month,
			day: clampedDay
		};
		const newBtn = this.dayButtons.get(clampedDay);
		if (newBtn) {
			newBtn.tabIndex = 0;
			newBtn.focus();
		}
	}
	selectDate(date) {
		if (this.isDateDisabled(date)) return;
		this.selectedDate = date;
		this.updateSelectedState();
		this.options.onSelect?.(date);
	}
	bindEvents() {
		const signal = this.abortController.signal;
		this.tbody.addEventListener("click", (e) => {
			const btn = e.target?.closest(".tp-day-btn");
			if (!btn) return;
			if (!btn.dataset.date) return;
			const dayNum = parseInt(btn.textContent ?? "", 10);
			if (Number.isNaN(dayNum)) return;
			const date = {
				year: this.visibleDate.year,
				month: this.visibleDate.month,
				day: dayNum
			};
			this.updateFocusedDay(dayNum);
			this.selectDate(date);
		}, { signal });
		this.table.addEventListener("keydown", (e) => {
			let handled = false;
			let targetDate = null;
			switch (e.key) {
				case "ArrowLeft": {
					const delta = this.isRtl ? 1 : -1;
					targetDate = addDays$1(this.focusedDate, delta, this.engine);
					handled = true;
					break;
				}
				case "ArrowRight": {
					const delta = this.isRtl ? -1 : 1;
					targetDate = addDays$1(this.focusedDate, delta, this.engine);
					handled = true;
					break;
				}
				case "ArrowUp":
					targetDate = addDays$1(this.focusedDate, -7, this.engine);
					handled = true;
					break;
				case "ArrowDown":
					targetDate = addDays$1(this.focusedDate, 7, this.engine);
					handled = true;
					break;
				case "Home": {
					const col = (weekday$1(this.focusedDate, this.engine) - this.firstDayOfWeek + 7) % 7;
					targetDate = addDays$1(this.focusedDate, -col, this.engine);
					handled = true;
					break;
				}
				case "End": {
					const col = (weekday$1(this.focusedDate, this.engine) - this.firstDayOfWeek + 7) % 7;
					targetDate = addDays$1(this.focusedDate, 6 - col, this.engine);
					handled = true;
					break;
				}
				case "PageUp":
					if (e.shiftKey) targetDate = addYears$1(this.focusedDate, -1, this.engine);
					else targetDate = addMonths$1(this.focusedDate, -1, this.engine);
					handled = true;
					break;
				case "PageDown":
					if (e.shiftKey) targetDate = addYears$1(this.focusedDate, 1, this.engine);
					else targetDate = addMonths$1(this.focusedDate, 1, this.engine);
					handled = true;
					break;
				case "Enter":
				case " ":
					handled = true;
					this.selectDate(this.focusedDate);
			}
			if (handled) e.preventDefault();
			if (targetDate) {
				if (targetDate.year === this.visibleDate.year && targetDate.month === this.visibleDate.month) this.updateFocusedDay(targetDate.day);
				else {
					this.focusedDate = targetDate;
					this.options.onNavigate?.(targetDate);
				}
			}
		}, { signal });
	}
};
//#endregion
//#region src/ui/dialog.ts
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
var DialogShell = class {
	input;
	options;
	engine;
	labels;
	abortController = new AbortController();
	elements;
	grid;
	valuePattern;
	visibleDate;
	selectedDate;
	destroyed = false;
	previousAnchorName = "";
	isProgrammaticChange = false;
	constructor(input, options) {
		this.input = input;
		this.options = options ?? {};
		this.engine = this.options.calendarEngine ?? fatimidAstronomicalCalendar$1;
		this.valuePattern = this.options.valuePattern ?? "YYYY-MM-DD";
		const isRtl = this.options.isRtl ?? (this.options.dir === "rtl" ? true : this.options.dir === "ltr" ? false : false);
		this.labels = {
			chooseDate: this.options.labels?.chooseDate ?? this.options.labels?.trigger ?? this.options.labels?.open ?? DEFAULT_LABELS.chooseDate,
			previousMonth: this.options.labels?.previousMonth ?? this.options.labels?.prev ?? DEFAULT_LABELS.previousMonth,
			prev: this.options.labels?.prev ?? (isRtl ? "›" : DEFAULT_LABELS.prev),
			nextMonth: this.options.labels?.nextMonth ?? this.options.labels?.next ?? DEFAULT_LABELS.nextMonth,
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
			liveRegion: this.options.labels?.liveRegion
		};
		const initialRaw = this.input.value.trim();
		if (initialRaw) {
			const parsed = parseValue$1(initialRaw, this.valuePattern, this.engine, this.labels.months);
			if (parsed) {
				if (this.options.minDate && isBefore$1(parsed, this.options.minDate)) {
					this.input.setAttribute("aria-invalid", "true");
					this.input.setCustomValidity(this.labels.outOfRange);
					this.visibleDate = this.options.initialDate ?? today$1(this.engine);
				} else if (this.options.maxDate && isAfter$1(parsed, this.options.maxDate)) {
					this.input.setAttribute("aria-invalid", "true");
					this.input.setCustomValidity(this.labels.outOfRange);
					this.visibleDate = this.options.initialDate ?? today$1(this.engine);
				} else {
					this.selectedDate = parsed;
					this.visibleDate = parsed;
				}
			} else {
				this.input.setAttribute("aria-invalid", "true");
				this.input.setCustomValidity(this.labels.invalidDate);
				this.visibleDate = this.options.initialDate ?? today$1(this.engine);
			}
		} else {
			this.selectedDate = this.options.selectedDate;
			this.visibleDate = this.selectedDate ?? this.options.initialDate ?? today$1(this.engine);
		}
		const uniqueId = nextUniqueId(this.options.idPrefix ?? "tp");
		const dialogId = `${uniqueId}-dialog`;
		const titleId = `${uniqueId}-title`;
		const anchorName = `--tp-anchor-${uniqueId}`;
		this.previousAnchorName = input.style.getPropertyValue("anchor-name");
		input.style.setProperty("anchor-name", anchorName);
		const trigger = document.createElement("button");
		trigger.type = "button";
		trigger.className = "tp-btn-trigger";
		trigger.setAttribute("aria-haspopup", "dialog");
		trigger.setAttribute("aria-expanded", "false");
		trigger.setAttribute("aria-controls", dialogId);
		trigger.setAttribute("aria-label", this.labels.chooseDate);
		trigger.title = this.labels.chooseDate;
		trigger.innerHTML = `<span class="tp-icon-wrapper" aria-hidden="true">${CALENDAR_SVG_ICON}</span>`;
		const dialog = document.createElement("dialog");
		dialog.className = "tp-dialog";
		dialog.id = dialogId;
		dialog.setAttribute("aria-labelledby", titleId);
		dialog.setAttribute("closedby", "any");
		dialog.style.setProperty("position-anchor", anchorName);
		if (isRtl) dialog.setAttribute("dir", "rtl");
		const title = document.createElement("h2");
		title.id = titleId;
		title.className = "tp-dialog-title tp-visually-hidden";
		title.textContent = this.labels.dialogTitle;
		dialog.appendChild(title);
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
		const liveRegion = document.createElement("div");
		liveRegion.className = "tp-live-region";
		liveRegion.setAttribute("aria-live", "polite");
		liveRegion.setAttribute("aria-atomic", "true");
		header.appendChild(liveRegion);
		dialog.appendChild(header);
		const gridContainer = document.createElement("div");
		gridContainer.className = "tp-grid-container";
		dialog.appendChild(gridContainer);
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
			}
		});
		gridContainer.appendChild(this.grid.getElement());
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
			btnClear
		};
		input.after(trigger, dialog);
		this.populateYearOptions();
		this.updateVisibleDisplay();
		this.bindEvents();
	}
	getElements() {
		return this.elements;
	}
	getGrid() {
		return this.grid;
	}
	getVisibleDate() {
		return this.visibleDate;
	}
	getSelectedDate() {
		return this.selectedDate;
	}
	setSelectedDate(date) {
		this.selectedDate = date;
		this.grid.setSelectedDate(date);
	}
	isOpen() {
		return this.elements.dialog.open;
	}
	open() {
		if (this.destroyed || this.isOpen()) return;
		this.elements.dialog.showModal();
		this.elements.trigger.setAttribute("aria-expanded", "true");
		this.grid.focusActiveDay();
		this.options.onOpen?.();
	}
	close() {
		if (this.destroyed || !this.isOpen()) return;
		this.elements.dialog.close();
		this.elements.trigger.setAttribute("aria-expanded", "false");
		this.elements.trigger.focus();
	}
	setVisibleDate(date, focusDay) {
		if (this.destroyed) return;
		this.visibleDate = date;
		this.updateVisibleDisplay();
		this.grid.setVisibleDate(date, focusDay);
		if (this.isOpen() && focusDay !== void 0) this.grid.focusActiveDay();
		this.options.onMonthChange?.(date);
	}
	getDate() {
		if (this.destroyed) return null;
		return this.selectedDate ?? null;
	}
	setDate(date) {
		if (this.destroyed) return;
		if (!date) {
			this.clear();
			return;
		}
		this.setVisibleDate(date, date.day);
		this.selectDate(date);
	}
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		if (this.isOpen()) try {
			this.elements.dialog.close();
		} catch {}
		this.grid.destroy();
		this.abortController.abort();
		this.elements.trigger.remove();
		this.elements.dialog.remove();
		if (this.previousAnchorName) this.input.style.setProperty("anchor-name", this.previousAnchorName);
		else this.input.style.removeProperty("anchor-name");
	}
	selectDate(date) {
		if (this.destroyed) return;
		if (this.options.minDate && isBefore$1(date, this.options.minDate)) return;
		if (this.options.maxDate && isAfter$1(date, this.options.maxDate)) return;
		this.selectedDate = date;
		this.grid.setSelectedDate(date);
		const formatted = formatValue$1(date, this.valuePattern, this.labels.months);
		this.input.value = formatted;
		this.input.removeAttribute("aria-invalid");
		this.input.setCustomValidity("");
		this.isProgrammaticChange = true;
		try {
			this.input.dispatchEvent(new Event("input", { bubbles: true }));
			this.input.dispatchEvent(new Event("change", { bubbles: true }));
			this.input.dispatchEvent(new CustomEvent("taarikh:change", {
				bubbles: true,
				detail: {
					date,
					value: formatted
				}
			}));
		} finally {
			this.isProgrammaticChange = false;
		}
		this.options.onSelect?.(date);
		this.close();
	}
	clear() {
		if (this.destroyed) return;
		this.selectedDate = void 0;
		this.grid.setSelectedDate(void 0);
		this.input.value = "";
		this.input.removeAttribute("aria-invalid");
		this.input.setCustomValidity("");
		this.isProgrammaticChange = true;
		try {
			this.input.dispatchEvent(new Event("input", { bubbles: true }));
			this.input.dispatchEvent(new Event("change", { bubbles: true }));
			this.input.dispatchEvent(new CustomEvent("taarikh:change", {
				bubbles: true,
				detail: {
					date: null,
					value: ""
				}
			}));
		} finally {
			this.isProgrammaticChange = false;
		}
		this.options.onClear?.();
	}
	handleInputChange() {
		if (this.destroyed || this.isProgrammaticChange) return;
		const raw = this.input.value.trim();
		if (!raw) {
			this.selectedDate = void 0;
			this.grid.setSelectedDate(void 0);
			this.input.removeAttribute("aria-invalid");
			this.input.setCustomValidity("");
			this.input.dispatchEvent(new CustomEvent("taarikh:change", {
				bubbles: true,
				detail: {
					date: null,
					value: ""
				}
			}));
			return;
		}
		const parsed = parseValue$1(raw, this.valuePattern, this.engine, this.labels.months);
		if (!parsed) {
			this.input.setAttribute("aria-invalid", "true");
			this.input.setCustomValidity(this.labels.invalidDate);
			return;
		}
		if (this.options.minDate && isBefore$1(parsed, this.options.minDate)) {
			this.input.setAttribute("aria-invalid", "true");
			this.input.setCustomValidity(this.labels.outOfRange);
			return;
		}
		if (this.options.maxDate && isAfter$1(parsed, this.options.maxDate)) {
			this.input.setAttribute("aria-invalid", "true");
			this.input.setCustomValidity(this.labels.outOfRange);
			return;
		}
		this.input.removeAttribute("aria-invalid");
		this.input.setCustomValidity("");
		this.setSelectedDate(parsed);
		this.setVisibleDate(parsed, parsed.day);
		this.input.dispatchEvent(new CustomEvent("taarikh:change", {
			bubbles: true,
			detail: {
				date: parsed,
				value: this.input.value
			}
		}));
	}
	[Symbol.dispose]() {
		this.destroy();
	}
	bindEvents() {
		const signal = this.abortController.signal;
		const { trigger, dialog, btnPrev, btnNext, selectMonth, selectYear, btnToday, btnClear } = this.elements;
		trigger.addEventListener("click", () => {
			if (this.isOpen()) this.close();
			else this.open();
		}, { signal });
		dialog.addEventListener("click", (e) => {
			if (e.target === dialog) {
				const rect = dialog.getBoundingClientRect();
				if (!(e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom)) this.close();
			}
		}, { signal });
		dialog.addEventListener("close", () => {
			trigger.setAttribute("aria-expanded", "false");
			this.options.onClose?.();
		}, { signal });
		this.input.addEventListener("change", () => {
			this.handleInputChange();
		}, { signal });
		selectMonth.addEventListener("change", () => {
			const month = parseInt(selectMonth.value, 10);
			if (!Number.isNaN(month)) {
				const year = this.visibleDate.year;
				let day = this.visibleDate.day;
				const maxDays = this.engine.daysInMonth(year, month);
				let minDay = 1;
				let maxDay = maxDays;
				if (this.options.minDate && year === this.options.minDate.year && month === this.options.minDate.month) minDay = this.options.minDate.day;
				if (this.options.maxDate && year === this.options.maxDate.year && month === this.options.maxDate.month) maxDay = this.options.maxDate.day;
				day = Math.max(minDay, Math.min(day, maxDay));
				this.setVisibleDate({
					year,
					month,
					day
				}, day);
			}
		}, { signal });
		selectYear.addEventListener("change", () => {
			const year = parseInt(selectYear.value, 10);
			if (!Number.isNaN(year)) {
				let month = this.visibleDate.month;
				const monthsCount = this.engine.monthsInYear(year);
				let minMonth = 1;
				let maxMonth = monthsCount;
				if (this.options.minDate && year === this.options.minDate.year) minMonth = this.options.minDate.month;
				if (this.options.maxDate && year === this.options.maxDate.year) maxMonth = this.options.maxDate.month;
				month = Math.max(minMonth, Math.min(month, maxMonth));
				let day = this.visibleDate.day;
				const maxDays = this.engine.daysInMonth(year, month);
				let minDay = 1;
				let maxDay = maxDays;
				if (this.options.minDate && year === this.options.minDate.year && month === this.options.minDate.month) minDay = this.options.minDate.day;
				if (this.options.maxDate && year === this.options.maxDate.year && month === this.options.maxDate.month) maxDay = this.options.maxDate.day;
				day = Math.max(minDay, Math.min(day, maxDay));
				this.setVisibleDate({
					year,
					month,
					day
				}, day);
			}
		}, { signal });
		btnPrev.addEventListener("click", () => {
			const prev = addMonths$1(this.visibleDate, -1, this.engine);
			this.setVisibleDate(prev);
		}, { signal });
		btnNext.addEventListener("click", () => {
			const next = addMonths$1(this.visibleDate, 1, this.engine);
			this.setVisibleDate(next);
		}, { signal });
		btnToday.addEventListener("click", () => {
			const todayDate = today$1(this.engine);
			this.setVisibleDate(todayDate, todayDate.day);
			this.selectDate(todayDate);
			this.options.onToday?.(todayDate);
		}, { signal });
		btnClear.addEventListener("click", () => {
			this.clear();
		}, { signal });
	}
	populateYearOptions() {
		const { selectYear } = this.elements;
		selectYear.innerHTML = "";
		let minYear = this.options.minDate?.year ?? Math.min(this.visibleDate.year - 50, 1300);
		let maxYear = this.options.maxDate?.year ?? Math.max(this.visibleDate.year + 50, 1500);
		if (this.visibleDate.year < minYear) minYear = this.options.minDate ? this.options.minDate.year : this.visibleDate.year;
		if (this.visibleDate.year > maxYear) maxYear = this.options.maxDate ? this.options.maxDate.year : this.visibleDate.year;
		for (let y = minYear; y <= maxYear; y += 1) {
			const opt = document.createElement("option");
			opt.value = String(y);
			opt.textContent = formatYear$1(y, this.options.locale);
			selectYear.appendChild(opt);
		}
	}
	updateVisibleDisplay() {
		const { selectMonth, selectYear, liveRegion, btnPrev, btnNext } = this.elements;
		const year = this.visibleDate.year;
		const month = this.visibleDate.month;
		if (!selectYear.querySelector(`option[value="${year}"]`)) this.populateYearOptions();
		const monthsCount = this.engine.monthsInYear(year);
		let minMonth = 1;
		let maxMonth = monthsCount;
		if (this.options.minDate && year === this.options.minDate.year) minMonth = this.options.minDate.month;
		if (this.options.maxDate && year === this.options.maxDate.year) maxMonth = this.options.maxDate.month;
		selectMonth.innerHTML = "";
		for (let m = minMonth; m <= maxMonth; m += 1) {
			const opt = document.createElement("option");
			opt.value = String(m);
			opt.textContent = this.getMonthName(m);
			selectMonth.appendChild(opt);
		}
		selectMonth.value = String(month);
		selectYear.value = String(year);
		const monthName = this.getMonthName(month);
		const yearDisplay = formatYear$1(year, this.options.locale);
		if (typeof this.labels.liveRegion === "function") liveRegion.textContent = this.labels.liveRegion(monthName, yearDisplay);
		else if (typeof this.labels.liveRegion === "string") liveRegion.textContent = this.labels.liveRegion.replace("{month}", monthName).replace("{year}", yearDisplay);
		else liveRegion.textContent = formatMonthHeading$1(this.visibleDate, this.engine, {
			locale: this.options.locale,
			labels: this.labels.months
		});
		if (this.options.minDate) {
			const isAtOrBeforeMin = year < this.options.minDate.year || year === this.options.minDate.year && month <= this.options.minDate.month;
			btnPrev.disabled = isAtOrBeforeMin;
			if (isAtOrBeforeMin) btnPrev.setAttribute("aria-disabled", "true");
			else btnPrev.removeAttribute("aria-disabled");
		} else {
			btnPrev.disabled = false;
			btnPrev.removeAttribute("aria-disabled");
		}
		if (this.options.maxDate) {
			const isAtOrAfterMax = year > this.options.maxDate.year || year === this.options.maxDate.year && month >= this.options.maxDate.month;
			btnNext.disabled = isAtOrAfterMax;
			if (isAtOrAfterMax) btnNext.setAttribute("aria-disabled", "true");
			else btnNext.removeAttribute("aria-disabled");
		} else {
			btnNext.disabled = false;
			btnNext.removeAttribute("aria-disabled");
		}
		const todayDate = today$1(this.engine);
		const isTodayOutOfRange = this.options.minDate && isBefore$1(todayDate, this.options.minDate) || this.options.maxDate && isAfter$1(todayDate, this.options.maxDate);
		this.elements.btnToday.disabled = Boolean(isTodayOutOfRange);
		if (isTodayOutOfRange) this.elements.btnToday.setAttribute("aria-disabled", "true");
		else this.elements.btnToday.removeAttribute("aria-disabled");
	}
	getMonthName(monthNumber) {
		return getMonthName$1(monthNumber, "long", this.labels.months) || `Month ${monthNumber}`;
	}
};
//#endregion
//#region src/index.ts
/**
* Determine the default first day of the week (0 = Sunday .. 6 = Saturday)
* using Intl.Locale getWeekInfo when supported, falling back to 0 (Sunday).
*/
function getDefaultFirstDayOfWeek(locale) {
	try {
		const loc = new Intl.Locale(locale || (typeof navigator !== "undefined" ? navigator.language : "en"));
		const weekInfo = loc.getWeekInfo?.() ?? loc.weekInfo;
		if (weekInfo && typeof weekInfo.firstDay === "number") return weekInfo.firstDay % 7;
	} catch {}
	return 0;
}
/**
* Resolve whether the picker should operate in RTL layout mode.
*/
function resolveIsRtl(input, dir, isRtl) {
	if (dir === "rtl") return true;
	if (dir === "ltr") return false;
	if (dir === void 0 && isRtl !== void 0) return isRtl;
	if (typeof document !== "undefined") {
		const closestDir = input.closest?.("[dir]")?.getAttribute("dir");
		if (closestDir) {
			const lower = closestDir.toLowerCase();
			if (lower === "rtl") return true;
			if (lower === "ltr") return false;
		}
		if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") try {
			const computed = window.getComputedStyle(input).direction;
			if (computed === "rtl") return true;
			if (computed === "ltr") return false;
		} catch {}
		if (document.documentElement?.dir) return document.documentElement.dir.toLowerCase() === "rtl";
		if (document.body?.dir) return document.body.dir.toLowerCase() === "rtl";
		if (document.dir) return document.dir.toLowerCase() === "rtl";
	}
	if (isRtl !== void 0) return isRtl;
	return false;
}
/**
* Accessible datepicker for Hijri calendars.
*/
var TaarikhPicker = class {
	input;
	options;
	dialogShell;
	constructor(input, options) {
		this.input = input;
		this.options = options ?? {};
		const firstDayOfWeek = this.options.firstDayOfWeek ?? getDefaultFirstDayOfWeek(this.options.locale);
		const isRtl = resolveIsRtl(input, this.options.dir, this.options.isRtl);
		this.dialogShell = new DialogShell(this.input, {
			labels: this.options.labels,
			minDate: this.options.minDate,
			maxDate: this.options.maxDate,
			calendarEngine: this.options.engine ?? fatimidAstronomicalCalendar$1,
			initialDate: this.options.initialDate,
			selectedDate: this.options.selectedDate,
			firstDayOfWeek,
			locale: this.options.locale,
			isRtl,
			idPrefix: this.options.idPrefix,
			valuePattern: this.options.valueFormat ?? this.options.valuePattern,
			onMonthChange: this.options.onMonthChange,
			onToday: this.options.onToday,
			onClear: this.options.onClear,
			onOpen: this.options.onOpen,
			onClose: this.options.onClose,
			onSelect: this.options.onSelect
		});
	}
	open() {
		this.dialogShell?.open();
	}
	close() {
		this.dialogShell?.close();
	}
	isOpen() {
		return this.dialogShell?.isOpen() ?? false;
	}
	getDate() {
		return this.dialogShell?.getDate() ?? null;
	}
	setDate(date) {
		this.dialogShell?.setDate(date);
	}
	getInput() {
		return this.input;
	}
	getElements() {
		return this.dialogShell?.getElements();
	}
	getVisibleDate() {
		return this.dialogShell?.getVisibleDate();
	}
	setVisibleDate(date) {
		this.dialogShell?.setVisibleDate(date);
	}
	destroy() {
		this.dialogShell?.destroy();
		this.dialogShell = void 0;
	}
	[Symbol.dispose]() {
		this.destroy();
	}
};
/**
* Public factory function to initialize a TaarikhPicker on an input element.
*/
function createPicker(input, options) {
	return new TaarikhPicker(input, options);
}
//#endregion
export { DEFAULT_LABELS, DEFAULT_MONTH_LABELS, FATIMID_MONTH_NAMES, FATIMID_MONTH_NAMES_SHORT, FatimidAstronomicalCalendar, TaarikhPicker, addDays, addMonths, addYears, clearFormatterCache, compareDates, createPicker, fatimidAstronomicalCalendar, formatDayAriaLabel, formatDisplay, formatMonthHeading, formatValue, formatYear, getDateTimeFormatter, getDefaultFirstDayOfWeek, getMonthName, getNumberFormatter, getWeekdayNames, gregorianToJulianDay, inferDateOrder, isAfter, isArabicScriptLocale, isBefore, isSameDay, parseValue, resolveIsRtl, today, weekday, weekdayFromJdn };

//# sourceMappingURL=index.js.map