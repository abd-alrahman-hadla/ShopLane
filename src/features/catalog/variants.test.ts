import { describe, expect, it } from "vitest";
import type { VariantOption } from "./types";
import {
  getAxisValues,
  getOptionValues,
  imageIndexForVariant,
  resolveInitialVariant,
  selectOption,
} from "./variants";

function variant(
  sku: string,
  size: string | null,
  color: string | null,
  stock: number,
  priceCents = 1000,
): VariantOption {
  return { id: sku, sku, title: sku, size, color, priceCents, compareAtPriceCents: null, stock };
}

const mug = [
  variant("08-WHT", "8 oz", "White", 30),
  variant("08-CLY", "8 oz", "Clay", 12),
  variant("12-WHT", "12 oz", "White", 26),
  variant("12-SGE", "12 oz", "Sage", 0),
];

describe("getAxisValues", () => {
  it("orders sizes naturally and keeps color order", () => {
    expect(getAxisValues(mug, "size")).toEqual(["8 oz", "12 oz"]);
    expect(getAxisValues(mug, "color")).toEqual(["White", "Clay", "Sage"]);
  });
});

describe("resolveInitialVariant", () => {
  it("uses the SKU from the URL when valid", () => {
    expect(resolveInitialVariant(mug, "12-SGE")?.sku).toBe("12-SGE");
  });

  it("falls back to the first in-stock variant", () => {
    const soldOutFirst = [variant("a", "1", null, 0), variant("b", "2", null, 5)];
    expect(resolveInitialVariant(soldOutFirst, "nope")?.sku).toBe("b");
  });

  it("falls back to the first variant when everything is sold out", () => {
    expect(resolveInitialVariant([variant("a", "1", null, 0)], null)?.sku).toBe("a");
  });
});

describe("getOptionValues", () => {
  it("marks combinations that do not exist or are sold out", () => {
    const selected = mug[2]!; // 12 oz / White
    expect(getOptionValues(mug, selected, "color")).toEqual([
      { value: "White", exists: true, inStock: true },
      { value: "Clay", exists: false, inStock: false },
      { value: "Sage", exists: true, inStock: false },
    ]);
  });
});

describe("selectOption", () => {
  it("keeps the other option when the combination exists", () => {
    expect(selectOption(mug, mug[0]!, "size", "12 oz").sku).toBe("12-WHT");
  });

  it("switches to an in-stock variant when the combination does not exist", () => {
    expect(selectOption(mug, mug[1]!, "size", "12 oz").sku).toBe("12-WHT");
  });
});

describe("imageIndexForVariant", () => {
  it("finds the variant's own image", () => {
    const images = [
      { id: "i1", url: "u1", alt: "", variantId: null },
      { id: "i2", url: "u2", alt: "", variantId: "12-SGE" },
    ];
    expect(imageIndexForVariant(images, "12-SGE")).toBe(1);
    expect(imageIndexForVariant(images, "08-WHT")).toBeUndefined();
  });
});
