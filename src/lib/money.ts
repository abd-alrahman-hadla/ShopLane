export const DEFAULT_CURRENCY = "usd";

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string): Intl.NumberFormat {
  const key = currency.toLowerCase();
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: key.toUpperCase() });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** Formats integer cents for display, e.g. 1850 → "$18.50". */
export function formatCents(cents: number, currency: string = DEFAULT_CURRENCY): string {
  if (!Number.isInteger(cents)) {
    throw new TypeError(`Expected integer cents, received ${cents}`);
  }
  return getFormatter(currency).format(cents / 100);
}

/** Converts whole currency units (e.g. dollars from a URL) to cents. */
export function unitsToCents(units: number): number {
  return Math.round(units * 100);
}

/** Converts cents to whole currency units, rounding down. */
export function centsToWholeUnits(cents: number): number {
  return Math.floor(cents / 100);
}
