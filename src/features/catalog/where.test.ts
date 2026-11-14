import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, SORT_OPTIONS } from "./filters";
import {
  buildOrderBy,
  buildProductWhere,
  buildScopeWhere,
  buildVariantWhere,
  getPageWindow,
} from "./where";

describe("buildScopeWhere", () => {
  it("always restricts to active products", () => {
    expect(buildScopeWhere({})).toEqual({ AND: [{ status: "ACTIVE" }] });
  });

  it("adds category and a case-insensitive search", () => {
    const where = buildScopeWhere({ category: "brewers", q: "press" });
    expect(where.AND).toContainEqual({ category: { slug: "brewers" } });
    expect(JSON.stringify(where)).toContain('"mode":"insensitive"');
  });
});

describe("buildVariantWhere", () => {
  it("returns undefined without variant filters", () => {
    expect(buildVariantWhere(DEFAULT_FILTERS)).toBeUndefined();
  });

  it("combines all variant conditions in one object, with prices in cents", () => {
    expect(
      buildVariantWhere({
        ...DEFAULT_FILTERS,
        minPrice: 10,
        maxPrice: 40,
        inStock: true,
        sizes: ["1 kg"],
        colors: ["Black"],
      }),
    ).toEqual({
      priceCents: { gte: 1000, lte: 4000 },
      stock: { gt: 0 },
      size: { in: ["1 kg"] },
      color: { in: ["Black"] },
    });
  });

  it("supports an open-ended price range", () => {
    expect(buildVariantWhere({ ...DEFAULT_FILTERS, minPrice: 0 })).toEqual({
      priceCents: { gte: 0 },
    });
    expect(buildVariantWhere({ ...DEFAULT_FILTERS, maxPrice: 25 })).toEqual({
      priceCents: { lte: 2500 },
    });
  });
});

describe("buildProductWhere", () => {
  it("uses a single variants.some clause for variant filters", () => {
    const where = buildProductWhere({ ...DEFAULT_FILTERS, inStock: true, sizes: ["250 g"] });
    expect(where).toEqual({
      AND: [
        { AND: [{ status: "ACTIVE" }] },
        { variants: { some: { stock: { gt: 0 }, size: { in: ["250 g"] } } } },
      ],
    });
  });

  it("keeps the ACTIVE condition with every filter combination", () => {
    const where = buildProductWhere({
      ...DEFAULT_FILTERS,
      q: "mug",
      category: "cups-accessories",
      colors: ["White"],
    });
    expect(JSON.stringify(where)).toContain('"status":"ACTIVE"');
  });
});

describe("buildOrderBy", () => {
  it("maps each sort option and ends with id for stable paging", () => {
    for (const sort of SORT_OPTIONS) {
      expect(buildOrderBy(sort).at(-1)).toEqual({ id: "asc" });
    }
    expect(buildOrderBy("price-asc")[0]).toEqual({ minPriceCents: "asc" });
    expect(buildOrderBy("price-desc")[0]).toEqual({ minPriceCents: "desc" });
    expect(buildOrderBy("featured")[0]).toEqual({ featured: "desc" });
    expect(buildOrderBy("newest")[0]).toEqual({ createdAt: "desc" });
    expect(buildOrderBy("name")[0]).toEqual({ name: "asc" });
  });
});

describe("getPageWindow", () => {
  it("computes skip/take for a page", () => {
    expect(getPageWindow(2, 30, 12)).toEqual({ page: 2, pageCount: 3, skip: 12, take: 12 });
  });

  it("clamps pages past the end", () => {
    expect(getPageWindow(9, 30, 12)).toMatchObject({ page: 3, skip: 24 });
  });

  it("has one page when there are no results", () => {
    expect(getPageWindow(1, 0, 12)).toEqual({ page: 1, pageCount: 1, skip: 0, take: 12 });
  });
});
