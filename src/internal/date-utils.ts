/**
 * Converts a Date object to an ISO string in the format YYYY-MM-DD.
 * @param date the Date object to convert
 * @returns the ISO string representation of the date
 */
export function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Converts a Date object to an ISO time string in the format HH:MM:SS.
 * @param date the Date object to convert
 * @returns the ISO time string representation of the date
 */
export function toIsoTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${min}:${s}`;
}

/**
 * Converts a Date object to an ISO date-time string in the format YYYY-MM-DDTHH:MM:SS.
 * @param date the Date object to convert
 * @returns the ISO date-time string representation of the date
 */
export function toIsoDateTime(date: Date): string {
  return `${toIso(date)}T${toIsoTime(date)}`;
}

/**
 * Converts an ISO string in the format YYYY-MM-DD to a Date object. Returns null if the string is not in the correct format.
 * @param isoString the ISO string to convert
 * @returns the Date object represented by the ISO string, or null if the string is not in the correct format
 */
export function dateFromIso(isoString: string): Date|null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoString);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/**
 * converts an ISO string in the format YYYY-MM-DDTHH:MM:SS to a Date object. Returns null if the string is not in the correct format.
 * @param isoString the ISO string to convert
 * @returns the Date object represented by the ISO string, or null if the string is not in the correct format
 */
export function dateTimeFromIso(isoString: string): Date|null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(isoString);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
}

/**
 * Returns a new Date object representing the start of the day (00:00:00) for the given date.
 * @param date the Date object to use
 * @returns a new Date object representing the start of the day for the given date
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Resolves the locale to use for date formatting based on the following precedence:
 * 1. The given attribute (default `lang`) of the given element
 * 2. The `lang` attribute of the document's root element
 * 3. The user's browser language settings
 * 4. Defaults to "en" if none of the above are available
 * @param element the HTML element to use for locale resolution
 * @param attr the attribute name to read the locale from (defaults to `lang`)
 * @returns the resolved locale string
 *
 * @memo Might want to move to a file dealing with internationalization if we add more i18n utilities in the future
 * @memo Might want to cache resolved locales on elements to avoid repeated lookups, though this function is only called
 * when formatting dates for display so it may not be a performance concern
 */
export function resolveLocale(element: HTMLElement, attr: string = "lang"): string {
  return (
    element.getAttribute(attr) ||
    document.documentElement.lang ||
    (typeof navigator !== "undefined" ? navigator.language : "en") ||
    "en"
  );
}