import type { CatalogFacets } from "./types";

const UNIT_SCALE: Record<string, { family: string; factor: number }> = {
  g: { family: "weight", factor: 1 },
  kg: { family: "weight", factor: 1000 },
  ml: { family: "volume", factor: 1 },
  l: { family: "volume", factor: 1000 },
  oz: { family: "oz", factor: 1 },
  cup: { family: "cup", factor: 1 },
  pack: { family: "pack", factor: 1 },
};

/** Parses sizes like "250 g", "1 kg", "1–2 cup", "12 oz" into a sortable key. */
function sizeKey(size: string): { family: string; value: number } {
  const match = /^(\d+(?:\.\d+)?)(?:\s*[–-]\s*\d+(?:\.\d+)?)?\s*([a-zA-Z]+)/.exec(size.trim());
  if (!match) return { family: `~${size.toLowerCase()}`, value: 0 };
  const amount = Number(match[1]);
  const unit = UNIT_SCALE[match[2]?.toLowerCase() ?? ""];
  if (!unit) return { family: `~${match[2]?.toLowerCase()}`, value: amount };
  return { family: unit.family, value: amount * unit.factor };
}

/** Orders sizes naturally: 250 g < 500 g < 1 kg, grouped by unit family. */
export function compareSizes(a: string, b: string): number {
  const ka = sizeKey(a);
  const kb = sizeKey(b);
  if (ka.family !== kb.family) return ka.family.localeCompare(kb.family);
  if (ka.value !== kb.value) return ka.value - kb.value;
  return a.localeCompare(b);
}

type FacetVariant = { size: string | null; color: string | null; priceCents: number };

/** Builds filter options from the variants of the products in scope. */
export function computeFacets(variants: readonly FacetVariant[]): CatalogFacets {
  const sizes = new Set<string>();
  const colors = new Set<string>();
  let min: number | null = null;
  let max: number | null = null;

  for (const variant of variants) {
    if (variant.size) sizes.add(variant.size);
    if (variant.color) colors.add(variant.color);
    min = min === null ? variant.priceCents : Math.min(min, variant.priceCents);
    max = max === null ? variant.priceCents : Math.max(max, variant.priceCents);
  }

  return {
    sizes: [...sizes].sort(compareSizes),
    colors: [...colors].sort((a, b) => a.localeCompare(b)),
    priceMin: min === null ? null : Math.floor(min / 100),
    priceMax: max === null ? null : Math.ceil(max / 100),
  };
}
