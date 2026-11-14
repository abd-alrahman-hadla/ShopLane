import { compareSizes } from "./options";
import type { ProductImageData, VariantOption } from "./types";

export type OptionAxis = "size" | "color";

export type OptionValue = {
  value: string;
  /** Some variant has this value together with the other selected option. */
  exists: boolean;
  /** That variant has stock. */
  inStock: boolean;
};

/** Distinct values per axis. Sizes are naturally ordered; colors keep variant order. */
export function getAxisValues(variants: readonly VariantOption[], axis: OptionAxis): string[] {
  const values = [...new Set(variants.map((v) => v[axis]).filter((v): v is string => v !== null))];
  return axis === "size" ? values.sort(compareSizes) : values;
}

/** Initial variant: the one in the URL, else the first in stock, else the first. */
export function resolveInitialVariant(
  variants: readonly VariantOption[],
  sku: string | null | undefined,
): VariantOption | undefined {
  return (
    (sku ? variants.find((v) => v.sku === sku) : undefined) ??
    variants.find((v) => v.stock > 0) ??
    variants[0]
  );
}

function otherAxis(axis: OptionAxis): OptionAxis {
  return axis === "size" ? "color" : "size";
}

/** Option buttons for one axis, given the currently selected variant. */
export function getOptionValues(
  variants: readonly VariantOption[],
  selected: VariantOption,
  axis: OptionAxis,
): OptionValue[] {
  const other = otherAxis(axis);
  return getAxisValues(variants, axis).map((value) => {
    const match = variants.find((v) => v[axis] === value && v[other] === selected[other]);
    return { value, exists: match !== undefined, inStock: (match?.stock ?? 0) > 0 };
  });
}

/**
 * Variant to switch to when a shopper picks `value` on `axis`. Keeps the other
 * option when that combination exists; otherwise prefers an in-stock variant.
 */
export function selectOption(
  variants: readonly VariantOption[],
  selected: VariantOption,
  axis: OptionAxis,
  value: string,
): VariantOption {
  const other = otherAxis(axis);
  const candidates = variants.filter((v) => v[axis] === value);
  return (
    candidates.find((v) => v[other] === selected[other]) ??
    candidates.find((v) => v.stock > 0) ??
    candidates[0] ??
    selected
  );
}

/** Index of the image to show for a variant: its own image if it has one. */
export function imageIndexForVariant(
  images: readonly ProductImageData[],
  variantId: string,
): number | undefined {
  const index = images.findIndex((image) => image.variantId === variantId);
  return index === -1 ? undefined : index;
}
