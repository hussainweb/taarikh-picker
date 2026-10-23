var TaarikhPicker = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region ../core/src/engine/helpers.ts
	/**
	* Return civil day of the week from Julian Day Number (JDN).
	*
	* Mapping: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
	* JDN 0 was a Monday in the proleptic Julian calendar.
	* Canonical formula: ((jdn + 1) % 7 + 7) % 7.
	*/
	function weekdayFromJdn(jdn) {
		return ((Math.floor(jdn) + 1) % 7 + 7) % 7;
	}
	function weekday(dateOrJdn, engine) {
		if (typeof dateOrJdn === "number") return weekdayFromJdn(dateOrJdn);
		if (!engine) throw new TypeError("CalendarEngine is required when passing a PlainDate to weekday()");
		return weekdayFromJdn(engine.toJulianDay(dateOrJdn));
	}
	/**
	* Convert a Gregorian civil date to Julian Day Number (JDN).
	* Standard astronomical formula (Fliegel & Van Flandern, 1968).
	*
	* @param year Gregorian year (e.g. 2026)
	* @param month Gregorian month (1-12)
	* @param day Gregorian day of month (1-31)
	*/
	function gregorianToJulianDay(year, month, day) {
		const a = Math.floor((14 - month) / 12);
		const y = year + 4800 - a;
		const m = month + 12 * a - 3;
		return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
	}
	/**
	* Add or subtract days to a date using JDN conversion via the engine.
	*/
	function addDays(date, days, engine) {
		const jdn = engine.toJulianDay(date);
		return engine.fromJulianDay(jdn + Math.trunc(days));
	}
	/**
	* Add or subtract months to a date, clamping the day to the target month's daysInMonth.
	* Accounts for calendar engines where monthsInYear varies across years.
	*/
	function addMonths(date, months, engine) {
		let year = date.year;
		let month = date.month;
		let remaining = Math.trunc(months);
		if (remaining > 0) while (remaining > 0) {
			const monthsLeftInYear = engine.monthsInYear(year) - month;
			if (remaining <= monthsLeftInYear) {
				month += remaining;
				remaining = 0;
			} else {
				remaining -= monthsLeftInYear + 1;
				year += 1;
				month = 1;
			}
		}
		else if (remaining < 0) {
			let negRemaining = -remaining;
			while (negRemaining > 0) {
				const monthsBeforeInYear = month - 1;
				if (negRemaining <= monthsBeforeInYear) {
					month -= negRemaining;
					negRemaining = 0;
				} else {
					negRemaining -= monthsBeforeInYear + 1;
					year -= 1;
					month = engine.monthsInYear(year);
				}
			}
		}
		const maxDays = engine.daysInMonth(year, month);
		const day = Math.max(1, Math.min(date.day, maxDays));
		return {
			year,
			month,
			day
		};
	}
	/**
	* Add or subtract years to a date, clamping the day to the target month's daysInMonth.
	*/
	function addYears(date, years, engine) {
		const targetYear = date.year + Math.trunc(years);
		const maxMonths = engine.monthsInYear(targetYear);
		const targetMonth = Math.min(date.month, maxMonths);
		const maxDays = engine.daysInMonth(targetYear, targetMonth);
		return {
			year: targetYear,
			month: targetMonth,
			day: Math.max(1, Math.min(date.day, maxDays))
		};
	}
	/**
	* Compare two dates chronologically.
	*
	* @returns -1 if a < b, 0 if a == b, 1 if a > b.
	*/
	function compareDates(a, b) {
		if (a.year !== b.year) return a.year < b.year ? -1 : 1;
		if (a.month !== b.month) return a.month < b.month ? -1 : 1;
		if (a.day !== b.day) return a.day < b.day ? -1 : 1;
		return 0;
	}
	/**
	* Returns true if both dates represent the same year, month, and day.
	*/
	function isSameDay(a, b) {
		return a.year === b.year && a.month === b.month && a.day === b.day;
	}
	/**
	* Returns true if date `a` is strictly before date `b`.
	*/
	function isBefore(a, b) {
		return compareDates(a, b) < 0;
	}
	/**
	* Returns true if date `a` is strictly after date `b`.
	*/
	function isAfter(a, b) {
		return compareDates(a, b) > 0;
	}
	/**
	* Return today's local civil date converted to the calendar engine.
	* Converts the current local civil Gregorian date to JDN, then calls engine.fromJulianDay(jdn).
	*/
	function today(engine, date = /* @__PURE__ */ new Date()) {
		const jdn = gregorianToJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
		return engine.fromJulianDay(jdn);
	}
	//#endregion
	//#region ../core/src/engine/fatimid.ts
	/**
	* Astronomical Fatimid Hijri calendar engine.
	*
	* Direct port of `Hussainweb\DateConverter\Algorithm\Hijri\HijriFatimidAstronomical`
	* from `hussainweb/date-converter`.
	*
	* Uses epoch JDN 1948084 (integer), 11 kabisa (leap) years in each 30-year cycle
	* [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29], alternating 30/29 month lengths,
	* and astronomical year counting (year 0 exists, no artificial year <= 0 jump).
	*/
	var FatimidAstronomicalCalendar = class FatimidAstronomicalCalendar {
		id = "fatimid-astronomical";
		/**
		* Astronomical epoch for the Fatimid Hijri calendar in integer Julian Day Number.
		* JDN 1948084 corresponds to 1 Muharram 1 AH being JDN 1948439.
		*/
		static EPOCH = 1948084;
		/**
		* Leap (kabisa) year indices within each 30-year cycle.
		*/
		static KABISA_YEARS = /* @__PURE__ */ new Set([
			2,
			5,
			8,
			10,
			13,
			16,
			19,
			21,
			24,
			27,
			29
		]);
		/**
		* Number of months in any Fatimid Hijri year (always 12).
		*/
		monthsInYear(_year) {
			return 12;
		}
		/**
		* Determines if the given year is a leap (kabisa) year.
		*
		* Uses non-negative modulo to correctly handle astronomical and negative years.
		*/
		isKabisa(year) {
			const cycle = (Math.trunc(year) % 30 + 30) % 30;
			return FatimidAstronomicalCalendar.KABISA_YEARS.has(cycle);
		}
		/**
		* Return number of days in the given month of the given year.
		*
		* Months 1..11 alternate 30 and 29 days (odd = 30, even = 29).
		* Month 12 has 30 days in a kabisa year and 29 days otherwise.
		*/
		daysInMonth(year, month) {
			if (month < 1 || month > 12) return 0;
			if (month === 12) return this.isKabisa(year) ? 30 : 29;
			return month % 2 === 0 ? 29 : 30;
		}
		/**
		* Convert a PlainDate to an integer Julian Day Number (JDN).
		*/
		toJulianDay(date) {
			return Math.floor(date.day + Math.ceil(29.5 * (date.month - 1)) + 354 * date.year + Math.floor(11 * date.year / 30) + FatimidAstronomicalCalendar.EPOCH);
		}
		/**
		* Convert an integer Julian Day Number (JDN) to a PlainDate.
		*
		* Exact arithmetic formula from PHP HijriAlgorithmBase::fromJulianDay.
		*/
		fromJulianDay(jdn) {
			const jd = Math.floor(jdn);
			const daysPerYear = 10631 / 30;
			const shift = .01 / 30;
			let z = jd - FatimidAstronomicalCalendar.EPOCH;
			const cyc = Math.floor(z / 10631);
			z -= 10631 * cyc;
			const j = Math.floor((z - shift) / daysPerYear);
			const year = 30 * cyc + j;
			z -= Math.floor(j * daysPerYear + shift);
			let month = Math.floor((z + 28.5001) / 29.5);
			if (month === 13) month = 12;
			const day = z - Math.floor(29.5001 * month - 29);
			return {
				year,
				month,
				day
			};
		}
	};
	/**
	* Singleton instance of the FatimidAstronomicalCalendar engine.
	*/
	const fatimidAstronomicalCalendar = new FatimidAstronomicalCalendar();
	//#endregion
	//#region ../core/src/engine/labels.ts
	/**
	* Transliterated full Fatimid month names (1-indexed, 12 months).
	*/
	const FATIMID_MONTH_NAMES = [
		"Moharram al-Haraam",
		"Safar al-Muzaffar",
		"Rabi' al-Awwal",
		"Rabi' al-Aakhar",
		"Jumada al-Ula",
		"Jumada al-Ukhra",
		"Rajab al-Asab",
		"Sha'ban al-Karim",
		"Ramadan al-Moazzam",
		"Shawwal al-Mukarram",
		"Zilqadah al-Haram",
		"Zilhajj al-Haraam"
	];
	/**
	* Transliterated short Fatimid month names (1-indexed, 12 months).
	*/
	const FATIMID_MONTH_NAMES_SHORT = [
		"Moharram",
		"Safar",
		"Rabi I",
		"Rabi II",
		"Jumada I",
		"Jumada II",
		"Rajab",
		"Sha'ban",
		"Ramadan",
		"Shawwal",
		"Zilqad",
		"Zilhaj"
	];
	/**
	* Default transliterated month labels.
	*/
	const DEFAULT_MONTH_LABELS = {
		long: FATIMID_MONTH_NAMES,
		short: FATIMID_MONTH_NAMES_SHORT
	};
	/**
	* Get the name of a month (1-indexed) from a labels dictionary.
	*
	* @param month Month index (1 to 12)
	* @param format 'long' or 'short' (default: 'long')
	* @param labels Optional custom labels dictionary
	* @returns The month name string, or empty string if month is out of range
	*/
	function getMonthName(month, format = "long", labels = DEFAULT_MONTH_LABELS) {
		return (format === "short" ? labels.short : labels.long)[month - 1] ?? "";
	}
	//#endregion
	//#region ../core/src/format/value.ts
	function normalizePattern(pattern) {
		return pattern.replace(/mmmm/g, "MMMM").replace(/mmm/g, "MMM").replace(/yyyy/g, "YYYY").replace(/yy/g, "YY").replace(/mm/g, "MM").replace(/dd/g, "DD");
	}
	/**
	* Format a PlainDate into a machine-readable value string.
	*
	* Supported format tokens:
	* - `YYYY`: 4-digit zero-padded year (ASCII digits)
	* - `MM`: 2-digit zero-padded month (01-12)
	* - `M`: Month number without zero-padding (1-12)
	* - `DD`: 2-digit zero-padded day of month (01-30)
	* - `D`: Day number without zero-padding (1-30)
	* - `MMMM`: Full transliterated month name
	* - `MMM`: Short transliterated month name
	*
	* Default pattern: "YYYY-MM-DD"
	* All numerical digits are strictly ASCII characters (0-9).
	*/
	function formatValue(date, pattern = "YYYY-MM-DD", labels = DEFAULT_MONTH_LABELS) {
		const normalizedPattern = normalizePattern(pattern);
		const yearStr = date.year < 0 ? `-${String(Math.abs(date.year)).padStart(4, "0")}` : String(date.year).padStart(4, "0");
		const monthStr2 = String(date.month).padStart(2, "0");
		const monthStr1 = String(date.month);
		const dayStr2 = String(date.day).padStart(2, "0");
		const dayStr1 = String(date.day);
		return normalizedPattern.replace(/MMMM|MMM|YYYY|MM|M|DD|D/g, (token) => {
			switch (token) {
				case "YYYY": return yearStr;
				case "MMMM": return getMonthName(date.month, "long", labels);
				case "MMM": return getMonthName(date.month, "short", labels);
				case "MM": return monthStr2;
				case "M": return monthStr1;
				case "DD": return dayStr2;
				case "D": return dayStr1;
				default: return token;
			}
		});
	}
	function escapeRegex(text) {
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	}
	/**
	* Strict parser for machine date strings.
	*
	* Parses a string formatted according to the given pattern and validates
	* that year, month, and day are valid civil calendar units.
	*
	* If an engine is provided, day bounds are strictly validated against
	* engine.daysInMonth(year, month) and month against engine.monthsInYear(year).
	*
	* Returns `PlainDate` if valid, or `null` if the input is malformed, has out-of-bounds
	* units, or contains non-ASCII digits.
	*/
	function parseValue(str, pattern = "YYYY-MM-DD", engine, labels = DEFAULT_MONTH_LABELS) {
		if (typeof str !== "string" || str.length === 0) return null;
		const normalizedPattern = normalizePattern(pattern);
		const tokenRegex = /MMMM|MMM|YYYY|MM|M|DD|D/g;
		const tokens = [];
		let lastIndex = 0;
		let match;
		while ((match = tokenRegex.exec(normalizedPattern)) !== null) {
			if (match.index > lastIndex) tokens.push({ literal: normalizedPattern.slice(lastIndex, match.index) });
			const token = match[0];
			if (token === "YYYY") tokens.push({ role: "year" });
			else if (token === "MMMM") tokens.push({ role: "monthLong" });
			else if (token === "MMM") tokens.push({ role: "monthShort" });
			else if (token === "MM") tokens.push({
				role: "month",
				exactLength: 2
			});
			else if (token === "M") tokens.push({ role: "month" });
			else if (token === "DD") tokens.push({
				role: "day",
				exactLength: 2
			});
			else if (token === "D") tokens.push({ role: "day" });
			lastIndex = tokenRegex.lastIndex;
		}
		if (lastIndex < pattern.length) tokens.push({ literal: pattern.slice(lastIndex) });
		const groupRoles = [];
		let regexSource = "^";
		for (const token of tokens) if (token.literal !== void 0) regexSource += escapeRegex(token.literal);
		else if (token.role !== void 0) {
			groupRoles.push(token.role);
			switch (token.role) {
				case "year":
					regexSource += "(-?[0-9]{4,}|[0-9]{1,4})";
					break;
				case "month":
					regexSource += token.exactLength === 2 ? "([0-9]{2})" : "([0-9]{1,2})";
					break;
				case "day":
					regexSource += token.exactLength === 2 ? "([0-9]{2})" : "([0-9]{1,2})";
					break;
				case "monthLong": {
					const names = [...labels.long].map(escapeRegex).sort((a, b) => b.length - a.length).join("|");
					regexSource += `(${names})`;
					break;
				}
				case "monthShort": {
					const names = [...labels.short].map(escapeRegex).sort((a, b) => b.length - a.length).join("|");
					regexSource += `(${names})`;
					break;
				}
			}
		}
		regexSource += "$";
		const result = new RegExp(regexSource).exec(str);
		if (!result) return null;
		let year = null;
		let month = null;
		let day = null;
		for (let i = 0; i < groupRoles.length; i++) {
			const role = groupRoles[i];
			const captured = result[i + 1];
			if (captured === void 0) return null;
			if (role === "year") year = parseInt(captured, 10);
			else if (role === "month") month = parseInt(captured, 10);
			else if (role === "day") day = parseInt(captured, 10);
			else if (role === "monthLong") {
				const idx = labels.long.indexOf(captured);
				if (idx === -1) return null;
				month = idx + 1;
			} else if (role === "monthShort") {
				const idx = labels.short.indexOf(captured);
				if (idx === -1) return null;
				month = idx + 1;
			}
		}
		if (year === null || month === null || day === null) return null;
		if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
		const maxMonths = engine ? engine.monthsInYear(year) : 12;
		if (month < 1 || month > maxMonths) return null;
		const maxDays = engine ? engine.daysInMonth(year, month) : 30;
		if (day < 1 || day > maxDays) return null;
		return {
			year,
			month,
			day
		};
	}
	//#endregion
	//#region ../core/src/format/display.ts
	const dateTimeFormatterCache = /* @__PURE__ */ new Map();
	const numberFormatterCache = /* @__PURE__ */ new Map();
	/**
	* Reset all cached Intl formatters (useful for tests).
	*/
	function clearFormatterCache() {
		dateTimeFormatterCache.clear();
		numberFormatterCache.clear();
	}
	/**
	* Return a cached Intl.DateTimeFormat instance.
	*/
	function getDateTimeFormatter(locale, options) {
		const key = `${locale ?? ""}|${options?.weekday ?? ""}|${options?.year ?? ""}|${options?.month ?? ""}|${options?.day ?? ""}|${options?.timeZone ?? "UTC"}`;
		let formatter = dateTimeFormatterCache.get(key);
		if (!formatter) {
			formatter = new Intl.DateTimeFormat(locale, options);
			dateTimeFormatterCache.set(key, formatter);
		}
		return formatter;
	}
	/**
	* Return a cached Intl.NumberFormat instance.
	*/
	function getNumberFormatter(locale, options) {
		const key = `${locale ?? ""}|${options?.useGrouping ?? false}|${options?.minimumIntegerDigits ?? 1}`;
		let formatter = numberFormatterCache.get(key);
		if (!formatter) {
			formatter = new Intl.NumberFormat(locale, options);
			numberFormatterCache.set(key, formatter);
		}
		return formatter;
	}
	/**
	* Format a calendar year number using localized numerals for the given locale.
	*/
	function formatYear(year, locale) {
		return getNumberFormatter(locale, { useGrouping: false }).format(year);
	}
	/**
	* Detect whether a locale uses Arabic comma ("، ", U+060C) as a separator.
	* Accurately covers Arabic (ar), Persian (fa), Urdu (ur), Pashto (ps), Uyghur (ug),
	* Sindhi (sd), Kurdish (ckb), and other Arabic-script languages without false-matching 'arn' (Mapudungun).
	*/
	function isArabicScriptLocale(locale) {
		if (!locale) return false;
		try {
			const loc = new Intl.Locale(locale);
			const lang = loc.language.toLowerCase();
			if (loc.script?.toLowerCase() === "arab") return true;
			if ([
				"ar",
				"fa",
				"ur",
				"ps",
				"ug",
				"sd",
				"ckb",
				"ks",
				"prs",
				"mzn",
				"glk",
				"pnb",
				"azb"
			].includes(lang)) return true;
		} catch {
			const lang = locale.split(/[-_]/)[0]?.toLowerCase();
			if (lang && [
				"ar",
				"fa",
				"ur",
				"ps",
				"ug",
				"sd",
				"ckb",
				"ks",
				"prs",
				"mzn",
				"glk",
				"pnb",
				"azb"
			].includes(lang)) return true;
		}
		return false;
	}
	/**
	* Infer the component order ('dmy', 'mdy', or 'ymd') for a given locale.
	* Defaults to 'dmy' for English/fallback (matching standard Hijri date conventions in English).
	*/
	function inferDateOrder(locale) {
		if (!locale || locale === "en") return "dmy";
		try {
			const dtf = getDateTimeFormatter(locale, {
				year: "numeric",
				month: "numeric",
				day: "numeric",
				timeZone: "UTC"
			});
			const sample = new Date(Date.UTC(2026, 3, 20, 12, 0, 0));
			const parts = dtf.formatToParts(sample);
			let dayIdx = -1;
			let monthIdx = -1;
			let yearIdx = -1;
			for (let i = 0; i < parts.length; i++) {
				const type = parts[i]?.type;
				if (type === "day") dayIdx = i;
				else if (type === "month") monthIdx = i;
				else if (type === "year") yearIdx = i;
			}
			if (yearIdx !== -1 && yearIdx < monthIdx && monthIdx < dayIdx) return "ymd";
			if (monthIdx !== -1 && monthIdx < dayIdx) return "mdy";
		} catch {}
		return "dmy";
	}
	/**
	* Return localized weekday names for the civil week using Intl.DateTimeFormat or custom labels.
	*
	* @param locale BCP 47 locale tag (default: system / undefined)
	* @param format 'long', 'short', 'narrow', or 'min' (alias for narrow)
	* @param firstDay First day of week index: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (default: 0)
	* @param customWeekdays Optional custom weekday names array or dictionary
	* @returns Array of 7 localized weekday names
	*/
	function getWeekdayNames(locale, format = "narrow", firstDay = 0, customWeekdays) {
		const normFormat = format === "min" ? "narrow" : format;
		const names = [];
		if (customWeekdays) {
			let list;
			if (Array.isArray(customWeekdays)) list = customWeekdays;
			else {
				const obj = customWeekdays;
				if (normFormat === "long") list = obj.long ?? obj.short ?? obj.narrow ?? obj.min;
				else if (normFormat === "short") list = obj.short ?? obj.min ?? obj.narrow ?? obj.long;
				else list = obj.narrow ?? obj.min ?? obj.short ?? obj.long;
			}
			if (list && list.length === 7) {
				for (let i = 0; i < 7; i++) {
					const dayIndex = ((firstDay + i) % 7 + 7) % 7;
					names.push(list[dayIndex] ?? "");
				}
				return names;
			}
		}
		const dtf = getDateTimeFormatter(locale, {
			weekday: normFormat,
			timeZone: "UTC"
		});
		for (let i = 0; i < 7; i++) {
			const dayIndex = ((firstDay + i) % 7 + 7) % 7;
			const sampleDate = new Date(Date.UTC(2026, 0, 4 + dayIndex, 12, 0, 0));
			names.push(dtf.format(sampleDate));
		}
		return names;
	}
	/**
	* Format a civil PlainDate for UI display.
	*
	* Strictly separates display concerns from submitted values:
	* - Uses cached Intl.DateTimeFormat for localized weekday names
	* - Uses cached Intl.NumberFormat for numerals in the chosen locale
	* - Uses the labels dictionary for month names
	* - Avoids hardcoded day-month-year order or simplistic locale detection
	*
	* @param date Civil date to format
	* @param engine CalendarEngine used to compute day of week
	* @param options Display options (locale, weekday, month, year, day, custom labels, order, separator)
	*/
	function formatDisplay(date, engine, options) {
		const locale = options?.locale;
		const labels = options?.labels ?? DEFAULT_MONTH_LABELS;
		const monthFormat = options?.month ?? "long";
		const dayOption = options?.day ?? "numeric";
		const yearOption = options?.year ?? "numeric";
		const weekdayOption = options?.weekday;
		let weekdayStr = "";
		if (weekdayOption) {
			const w = weekday(date, engine);
			if (options?.weekdays) weekdayStr = getWeekdayNames(locale, weekdayOption, 0, options.weekdays)[w] ?? "";
			else {
				const sampleDate = new Date(Date.UTC(2026, 0, 4 + w, 12, 0, 0));
				weekdayStr = getDateTimeFormatter(locale, {
					weekday: weekdayOption === "min" ? "narrow" : weekdayOption,
					timeZone: "UTC"
				}).format(sampleDate);
			}
		}
		const monthStr = getMonthName(date.month, monthFormat, labels);
		let dayStr = "";
		if (dayOption === "numeric") dayStr = getNumberFormatter(locale, { useGrouping: false }).format(date.day);
		else if (dayOption === "2-digit") dayStr = getNumberFormatter(locale, {
			minimumIntegerDigits: 2,
			useGrouping: false
		}).format(date.day);
		let yearStr = "";
		if (yearOption === "numeric") yearStr = getNumberFormatter(locale, { useGrouping: false }).format(date.year);
		else if (yearOption === "2-digit") {
			const numFmt = getNumberFormatter(locale, {
				minimumIntegerDigits: 2,
				useGrouping: false
			});
			const twoDigitYear = Math.abs(date.year) % 100;
			yearStr = numFmt.format(twoDigitYear);
		}
		const order = options?.order ?? inferDateOrder(locale);
		const dateParts = [];
		if (order === "ymd") {
			if (yearStr) dateParts.push(yearStr);
			if (monthStr) dateParts.push(monthStr);
			if (dayStr) dateParts.push(dayStr);
		} else if (order === "mdy") {
			if (monthStr) dateParts.push(monthStr);
			if (dayStr) dateParts.push(dayStr);
			if (yearStr) dateParts.push(yearStr);
		} else {
			if (dayStr) dateParts.push(dayStr);
			if (monthStr) dateParts.push(monthStr);
			if (yearStr) dateParts.push(yearStr);
		}
		const datePart = dateParts.join(" ");
		if (weekdayStr && datePart) {
			const separator = options?.separator ?? (isArabicScriptLocale(locale) ? "، " : ", ");
			return `${weekdayStr}${separator}${datePart}`;
		}
		if (weekdayStr) return weekdayStr;
		return datePart;
	}
	/**
	* Format a full accessible ARIA label for a calendar grid day cell.
	* E.g. "Friday, 1 Ramadan al-Moazzam 1445"
	*/
	function formatDayAriaLabel(date, engine, locale, labels, weekdays, order) {
		return formatDisplay(date, engine, {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
			locale,
			labels,
			weekdays,
			order
		});
	}
	/**
	* Format a heading label for month navigation views.
	* E.g. "Ramadan al-Moazzam 1445"
	*/
	function formatMonthHeading(date, engine, options) {
		return formatDisplay(date, engine, {
			day: false,
			month: options?.month ?? "long",
			year: "numeric",
			locale: options?.locale,
			labels: options?.labels,
			order: options?.order
		});
	}
	//#endregion
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
		months: DEFAULT_MONTH_LABELS,
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
			if (this.minDate && compareDates(date, this.minDate) < 0) return true;
			if (this.maxDate && compareDates(date, this.maxDate) > 0) return true;
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
			const todayDate = today(this.engine);
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
			const shortNames = getWeekdayNames(this.options.locale, "short", this.firstDayOfWeek, this.options.labels?.weekdays);
			const longNames = getWeekdayNames(this.options.locale, "long", this.firstDayOfWeek, this.options.labels?.weekdays);
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
			const todayDate = today(this.engine);
			const leadingEmptyCells = ((weekday({
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
				btn.dataset.date = formatValue(date);
				const ariaLabel = formatDayAriaLabel(date, this.engine, this.options.locale, this.options.labels?.months, this.options.labels?.weekdays);
				btn.setAttribute("aria-label", ariaLabel);
				const isSelected = this.selectedDate !== void 0 && isSameDay(date, this.selectedDate);
				td.setAttribute("aria-selected", isSelected ? "true" : "false");
				btn.dataset.selected = isSelected ? "true" : "false";
				if (isSameDay(date, todayDate)) btn.setAttribute("aria-current", "date");
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
				const isSelected = this.selectedDate !== void 0 && isSameDay(date, this.selectedDate);
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
						targetDate = addDays(this.focusedDate, delta, this.engine);
						handled = true;
						break;
					}
					case "ArrowRight": {
						const delta = this.isRtl ? -1 : 1;
						targetDate = addDays(this.focusedDate, delta, this.engine);
						handled = true;
						break;
					}
					case "ArrowUp":
						targetDate = addDays(this.focusedDate, -7, this.engine);
						handled = true;
						break;
					case "ArrowDown":
						targetDate = addDays(this.focusedDate, 7, this.engine);
						handled = true;
						break;
					case "Home": {
						const col = (weekday(this.focusedDate, this.engine) - this.firstDayOfWeek + 7) % 7;
						targetDate = addDays(this.focusedDate, -col, this.engine);
						handled = true;
						break;
					}
					case "End": {
						const col = (weekday(this.focusedDate, this.engine) - this.firstDayOfWeek + 7) % 7;
						targetDate = addDays(this.focusedDate, 6 - col, this.engine);
						handled = true;
						break;
					}
					case "PageUp":
						if (e.shiftKey) targetDate = addYears(this.focusedDate, -1, this.engine);
						else targetDate = addMonths(this.focusedDate, -1, this.engine);
						handled = true;
						break;
					case "PageDown":
						if (e.shiftKey) targetDate = addYears(this.focusedDate, 1, this.engine);
						else targetDate = addMonths(this.focusedDate, 1, this.engine);
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
			this.engine = this.options.calendarEngine ?? fatimidAstronomicalCalendar;
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
			this.syncFromInputValue();
			this.elements.dialog.showModal();
			this.elements.trigger.setAttribute("aria-expanded", "true");
			this.grid.focusActiveDay();
			this.options.onOpen?.();
		}
		syncFromInputValue() {
			const raw = this.input.value.trim();
			if (!raw) return;
			const parsed = parseValue(raw, this.valuePattern, this.engine, this.labels.months);
			if (!parsed) return;
			if (this.options.minDate && isBefore(parsed, this.options.minDate)) return;
			if (this.options.maxDate && isAfter(parsed, this.options.maxDate)) return;
			this.selectedDate = parsed;
			this.visibleDate = parsed;
			this.grid.setSelectedDate(parsed);
			this.grid.setVisibleDate(parsed, parsed.day);
			this.updateVisibleDisplay();
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
			if (this.options.minDate && isBefore(date, this.options.minDate)) return;
			if (this.options.maxDate && isAfter(date, this.options.maxDate)) return;
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
				const prev = addMonths(this.visibleDate, -1, this.engine);
				this.setVisibleDate(prev);
			}, { signal });
			btnNext.addEventListener("click", () => {
				const next = addMonths(this.visibleDate, 1, this.engine);
				this.setVisibleDate(next);
			}, { signal });
			btnToday.addEventListener("click", () => {
				const todayDate = today(this.engine);
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
				opt.textContent = formatYear(y, this.options.locale);
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
			const yearDisplay = formatYear(year, this.options.locale);
			if (typeof this.labels.liveRegion === "function") liveRegion.textContent = this.labels.liveRegion(monthName, yearDisplay);
			else if (typeof this.labels.liveRegion === "string") liveRegion.textContent = this.labels.liveRegion.replace("{month}", monthName).replace("{year}", yearDisplay);
			else liveRegion.textContent = formatMonthHeading(this.visibleDate, this.engine, {
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
			const todayDate = today(this.engine);
			const isTodayOutOfRange = this.options.minDate && isBefore(todayDate, this.options.minDate) || this.options.maxDate && isAfter(todayDate, this.options.maxDate);
			this.elements.btnToday.disabled = Boolean(isTodayOutOfRange);
			if (isTodayOutOfRange) this.elements.btnToday.setAttribute("aria-disabled", "true");
			else this.elements.btnToday.removeAttribute("aria-disabled");
		}
		getMonthName(monthNumber) {
			return getMonthName(monthNumber, "long", this.labels.months) || `Month ${monthNumber}`;
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
				calendarEngine: this.options.engine ?? fatimidAstronomicalCalendar,
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
	exports.DEFAULT_LABELS = DEFAULT_LABELS;
	exports.DEFAULT_MONTH_LABELS = DEFAULT_MONTH_LABELS;
	exports.FATIMID_MONTH_NAMES = FATIMID_MONTH_NAMES;
	exports.FATIMID_MONTH_NAMES_SHORT = FATIMID_MONTH_NAMES_SHORT;
	exports.FatimidAstronomicalCalendar = FatimidAstronomicalCalendar;
	exports.TaarikhPicker = TaarikhPicker;
	exports.addDays = addDays;
	exports.addMonths = addMonths;
	exports.addYears = addYears;
	exports.clearFormatterCache = clearFormatterCache;
	exports.compareDates = compareDates;
	exports.createPicker = createPicker;
	exports.fatimidAstronomicalCalendar = fatimidAstronomicalCalendar;
	exports.formatDayAriaLabel = formatDayAriaLabel;
	exports.formatDisplay = formatDisplay;
	exports.formatMonthHeading = formatMonthHeading;
	exports.formatValue = formatValue;
	exports.formatYear = formatYear;
	exports.getDateTimeFormatter = getDateTimeFormatter;
	exports.getDefaultFirstDayOfWeek = getDefaultFirstDayOfWeek;
	exports.getMonthName = getMonthName;
	exports.getNumberFormatter = getNumberFormatter;
	exports.getWeekdayNames = getWeekdayNames;
	exports.gregorianToJulianDay = gregorianToJulianDay;
	exports.inferDateOrder = inferDateOrder;
	exports.isAfter = isAfter;
	exports.isArabicScriptLocale = isArabicScriptLocale;
	exports.isBefore = isBefore;
	exports.isSameDay = isSameDay;
	exports.parseValue = parseValue;
	exports.resolveIsRtl = resolveIsRtl;
	exports.today = today;
	exports.weekday = weekday;
	exports.weekdayFromJdn = weekdayFromJdn;
	return exports;
})({});

//# sourceMappingURL=index.iife.js.map