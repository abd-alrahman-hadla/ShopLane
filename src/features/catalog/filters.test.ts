import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  buildCatalogHref,
  countActiveFilters,
  parseCatalogParams,
  searchParamsToRecord,
  serializeCatalogParams,
  toggleValue,
  updateFilters,
} from "./filters";

describe("parseCatalogParams", () => {
  it("returns defaults for empty params", () => {
    expect(parseCatalogParams({})).toEqual({
      ...DEFAULT_FILTERS,
      q: undefined,
      category: undefined,
    });
  });

  it("parses every supported param", () => {
    const filters = parseCatalogParams({
      q: "  kettle ",
      category: "grinders-kettles",
      min: "10",
      max: "40",
      inStock: "1",
      size: ["500 g", "250 g"],
      color: "Black",
      sort: "price-asc",
      page: "2",
    });
    expect(filters).toEqual({
      q: "kettle",
      category: "grinders-kettles",
      minPrice: 10,
      maxPrice: 40,
      inStock: true,
      sizes: ["250 g", "500 g"],
      colors: ["Black"],
      sort: "price-asc",
      page: 2,
    });
  });

  it("drops junk values instead of throwing", () => {
    const filters = parseCatalogParams({
      q: "   ",
      category: "Not A Slug!",
      min: "-5",
      max: "abc",
      inStock: "maybe",
      sort: "cheapest",
      page: "0",
    });
    expect(filters).toEqual({
      ...DEFAULT_FILTERS,
      q: undefined,
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
    });
  });

  it("swaps an inverted price range", () => {
    const filters = parseCatalogParams({ min: "50", max: "20" });
    expect([filters.minPrice, filters.maxPrice]).toEqual([20, 50]);
  });

  it("de-duplicates multi-value params", () => {
    expect(parseCatalogParams({ color: ["White", "Black", "White"] }).colors).toEqual([
      "Black",
      "White",
    ]);
  });

  it("uses the first value of a repeated single-value param", () => {
    expect(parseCatalogParams({ page: ["3", "4"] }).page).toBe(3);
  });
});

describe("serializeCatalogParams", () => {
  it("omits defaults", () => {
    expect(serializeCatalogParams(DEFAULT_FILTERS)).toBe("");
  });

  it("uses a stable key order and sorted values", () => {
    const query = serializeCatalogParams({
      ...DEFAULT_FILTERS,
      page: 3,
      sort: "name",
      colors: ["White", "Black"],
      sizes: ["1 kg"],
      inStock: true,
      maxPrice: 40,
      minPrice: 10,
      category: "brewers",
      q: "press",
    });
    expect(query).toBe(
      "q=press&category=brewers&min=10&max=40&inStock=1&size=1+kg&color=Black&color=White&sort=name&page=3",
    );
  });

  it("round-trips through parse", () => {
    const filters = parseCatalogParams({
      size: ["250 g", "1 kg"],
      color: "Copper",
      min: "5",
      sort: "newest",
      page: "2",
    });
    const reparsed = parseCatalogParams(
      searchParamsToRecord(new URLSearchParams(serializeCatalogParams(filters))),
    );
    expect(reparsed).toEqual(filters);
  });

  it("produces the same URL for equivalent inputs", () => {
    const a = serializeCatalogParams(
      parseCatalogParams({ color: ["White", "Black"], inStock: "true" }),
    );
    const b = serializeCatalogParams(
      parseCatalogParams({ inStock: "1", color: ["Black", "White", "Black"] }),
    );
    expect(a).toBe(b);
  });
});

describe("buildCatalogHref", () => {
  it("puts the category in the path when browsing", () => {
    const filters = { ...DEFAULT_FILTERS, category: "brewers", inStock: true };
    expect(buildCatalogHref(filters, "browse")).toBe("/categories/brewers?inStock=1");
  });

  it("links to all products without a category", () => {
    expect(buildCatalogHref(DEFAULT_FILTERS, "browse")).toBe("/products");
  });

  it("keeps the category as a query param when searching", () => {
    const filters = { ...DEFAULT_FILTERS, q: "mug", category: "cups-accessories" };
    expect(buildCatalogHref(filters, "search")).toBe("/search?q=mug&category=cups-accessories");
  });
});

describe("filter helpers", () => {
  it("updateFilters resets the page", () => {
    expect(updateFilters({ ...DEFAULT_FILTERS, page: 4 }, { inStock: true })).toMatchObject({
      page: 1,
      inStock: true,
    });
  });

  it("updateFilters keeps an explicit page", () => {
    expect(updateFilters(DEFAULT_FILTERS, { page: 2 }).page).toBe(2);
  });

  it("toggleValue adds and removes", () => {
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
  });

  it("counts active filters, excluding sort, page, query and category", () => {
    expect(
      countActiveFilters({
        ...DEFAULT_FILTERS,
        sort: "name",
        page: 2,
        q: "x",
        category: "brewers",
      }),
    ).toBe(0);
    expect(
      countActiveFilters({
        ...DEFAULT_FILTERS,
        minPrice: 5,
        inStock: true,
        sizes: ["1 L"],
        colors: ["Black", "White"],
      }),
    ).toBe(5);
  });
});
