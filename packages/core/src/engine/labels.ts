/**
 * Transliterated month name labels for the Fatimid Astronomical calendar.
 */

export interface MonthLabels {
  readonly long: readonly string[];
  readonly short: readonly string[];
}

/**
 * Transliterated full Fatimid month names (1-indexed, 12 months).
 */
export const FATIMID_MONTH_NAMES: readonly string[] = [
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
  "Zilhajj al-Haraam",
] as const;

/**
 * Transliterated short Fatimid month names (1-indexed, 12 months).
 */
export const FATIMID_MONTH_NAMES_SHORT: readonly string[] = [
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
  "Zilhaj",
] as const;

/**
 * Default transliterated month labels.
 */
export const DEFAULT_MONTH_LABELS: MonthLabels = {
  long: FATIMID_MONTH_NAMES,
  short: FATIMID_MONTH_NAMES_SHORT,
};

/**
 * Get the name of a month (1-indexed) from a labels dictionary.
 *
 * @param month Month index (1 to 12)
 * @param format 'long' or 'short' (default: 'long')
 * @param labels Optional custom labels dictionary
 * @returns The month name string, or empty string if month is out of range
 */
export function getMonthName(
  month: number,
  format: "long" | "short" = "long",
  labels: MonthLabels = DEFAULT_MONTH_LABELS,
): string {
  const names = format === "short" ? labels.short : labels.long;
  const index = month - 1;
  return names[index] ?? "";
}
