import type { Locale } from "@/i18n/routing";
import { STORE_TIME_ZONE } from "@/lib/store";

/**
 * Locale-aware display formatting. Arabic uses Latin digits (common for prices
 * in Gulf e-commerce); change NUMBERING to "arab" for Arabic-Indic digits.
 */
const NUMBERING = "latn";

const INTL_LOCALES: Record<Locale, string> = {
  en: "en-US",
  ar: `ar-u-nu-${NUMBERING}`,
};

export function intlLocale(locale: Locale): string {
  return INTL_LOCALES[locale];
}

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat>(key: string, make: () => T): T {
  let value = cache.get(key) as T | undefined;
  if (!value) {
    value = make();
    cache.set(key, value);
  }
  return value;
}

/** The currency's plain symbol ("$" for USD), as an English US page shows it. */
function plainSymbol(code: string): string {
  const parts = cached(
    `symbol:${code}`,
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
      }),
  ).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? code;
}

/**
 * A currency formatter for the locale that always shows the plain symbol:
 * Arabic would otherwise write "US$" (even with currencyDisplay "narrowSymbol").
 */
export function formatCurrency(
  value: number,
  locale: Locale,
  currency: string,
  options: Intl.NumberFormatOptions = {},
): string {
  const code = currency.toUpperCase();
  const formatter = cached(
    `currency:${locale}:${code}:${JSON.stringify(options)}`,
    () =>
      new Intl.NumberFormat(intlLocale(locale), { ...options, style: "currency", currency: code }),
  );
  const symbol = plainSymbol(code);
  return formatter
    .formatToParts(value)
    .map((part) => (part.type === "currency" ? symbol : part.value))
    .join("");
}

/** Integer cents → "$18.50" / "‏18.50 $". */
export function formatMoney(cents: number, locale: Locale, currency = "usd"): string {
  if (!Number.isInteger(cents)) throw new TypeError(`Expected integer cents, received ${cents}`);
  return formatCurrency(cents / 100, locale, currency);
}

export function formatNumber(value: number, locale: Locale): string {
  return cached(`number:${locale}`, () => new Intl.NumberFormat(intlLocale(locale))).format(value);
}

export function formatPercent(fraction: number, locale: Locale): string {
  return cached(
    `percent:${locale}`,
    () =>
      new Intl.NumberFormat(intlLocale(locale), {
        style: "percent",
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
      }),
  ).format(fraction);
}

export type DateStyle = "date" | "dateTime" | "dayMonth";

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  date: { day: "numeric", month: "short", year: "numeric" },
  dateTime: { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" },
  dayMonth: { day: "numeric", month: "short" },
};

/** Dates in store time (America/New_York), so "today" matches the admin's day. */
export function formatDate(date: Date | string, locale: Locale, style: DateStyle = "date"): string {
  return cached(
    `date:${locale}:${style}`,
    () =>
      new Intl.DateTimeFormat(intlLocale(locale), {
        ...DATE_OPTIONS[style],
        timeZone: STORE_TIME_ZONE,
      }),
  ).format(typeof date === "string" ? new Date(date) : date);
}
