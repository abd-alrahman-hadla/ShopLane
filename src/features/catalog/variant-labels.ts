/**
 * Display labels for variant options in the shopper's language. Variant data
 * (titles, size/colour values, filter URLs) stays English in the database; only
 * what's shown is translated. Unknown values are shown as stored.
 */
import type { Locale } from "@/i18n/routing";

const COLORS_AR: Record<string, string> = {
  Black: "أسود",
  White: "أبيض",
  Clay: "طيني",
  Clear: "شفاف",
  Copper: "نحاسي",
  Sage: "أخضر مريمي",
  Steel: "فولاذي",
  Walnut: "خشب الجوز",
};

const PHRASES_AR: Record<string, string> = {
  "Set of 2": "طقم من 2",
};

const UNITS_AR: Record<string, string> = {
  g: "غ",
  kg: "كغ",
  ml: "مل",
  L: "لتر",
  oz: "أونصة",
  cup: "كوب",
  pack: "قطعة",
};

const SIZE_PATTERN = /^([\d.,–-]+)\s*(g|kg|ml|L|oz|cup|pack)$/;

/** "250 g" → "250 غ", "1–2 cup" → "1–2 كوب". */
export function sizeLabel(size: string, locale: Locale): string {
  if (locale === "en") return size;
  const match = SIZE_PATTERN.exec(size.trim());
  if (!match) return PHRASES_AR[size] ?? size;
  const [, amount, unit] = match;
  return `${amount} ${UNITS_AR[unit as keyof typeof UNITS_AR] ?? unit}`;
}

export function colorLabel(color: string, locale: Locale): string {
  return locale === "en" ? color : (COLORS_AR[color] ?? color);
}

/** "8 oz / White" → "8 أونصة / أبيض": each part is a colour, a size or a phrase. */
export function variantLabel(title: string, locale: Locale): string {
  if (locale === "en") return title;
  return title
    .split(" / ")
    .map((part) => COLORS_AR[part] ?? PHRASES_AR[part] ?? sizeLabel(part, locale))
    .join(" / ");
}
