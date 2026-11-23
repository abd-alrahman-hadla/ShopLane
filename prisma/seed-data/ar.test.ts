import { describe, expect, it } from "vitest";
import { arCategories, arProducts, seedCategories, seedProducts } from "./index";

const ARABIC = /[\u0600-\u06FF]/;

describe("Arabic seed content", () => {
  it("translates every seeded category and product, and nothing else", () => {
    expect(Object.keys(arCategories).sort()).toEqual(seedCategories.map((c) => c.slug).sort());
    expect(Object.keys(arProducts).sort()).toEqual(seedProducts.map((p) => p.slug).sort());
  });

  it("has Arabic names and descriptions", () => {
    for (const entry of [...Object.values(arCategories), ...Object.values(arProducts)]) {
      expect(entry.name).toMatch(ARABIC);
      expect(entry.description).toMatch(ARABIC);
      expect(entry.description.length).toBeGreaterThan(30);
    }
  });
});
