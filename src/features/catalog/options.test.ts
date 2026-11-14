import { describe, expect, it } from "vitest";
import { compareSizes, computeFacets } from "./options";

describe("compareSizes", () => {
  it("orders weights and volumes naturally across units", () => {
    expect(["1 kg", "250 g", "500 g", "125 g"].sort(compareSizes)).toEqual([
      "125 g",
      "250 g",
      "500 g",
      "1 kg",
    ]);
    expect(["1 L", "350 ml", "2 L", "600 ml"].sort(compareSizes)).toEqual([
      "350 ml",
      "600 ml",
      "1 L",
      "2 L",
    ]);
  });

  it("handles ranges and counts", () => {
    expect(["2–4 cup", "1–2 cup", "6 cup", "3 cup"].sort(compareSizes)).toEqual([
      "1–2 cup",
      "2–4 cup",
      "3 cup",
      "6 cup",
    ]);
    expect(["200 pack", "100 pack"].sort(compareSizes)).toEqual(["100 pack", "200 pack"]);
  });

  it("keeps unknown formats in a stable position", () => {
    expect(["Large", "Small"].sort(compareSizes)).toEqual(["Large", "Small"]);
  });
});

describe("computeFacets", () => {
  it("collects distinct sizes and colors and the price bounds in whole units", () => {
    expect(
      computeFacets([
        { size: "1 kg", color: null, priceCents: 6700 },
        { size: "250 g", color: null, priceCents: 2150 },
        { size: null, color: "White", priceCents: 2800 },
        { size: "250 g", color: "Black", priceCents: 2800 },
      ]),
    ).toEqual({ sizes: ["250 g", "1 kg"], colors: ["Black", "White"], priceMin: 21, priceMax: 67 });
  });

  it("returns empty facets with no variants", () => {
    expect(computeFacets([])).toEqual({ sizes: [], colors: [], priceMin: null, priceMax: null });
  });
});
