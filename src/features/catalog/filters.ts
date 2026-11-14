import { z } from "zod";

export const SORT_OPTIONS = ["featured", "newest", "price-asc", "price-desc", "name"] as const;
export type CatalogSort = (typeof SORT_OPTIONS)[number];
export const DEFAULT_SORT: CatalogSort = "featured";

export const SORT_LABELS: Record<CatalogSort, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name: A–Z",
};

export type CatalogFilters = {
  q?: string;
  category?: string;
  /** Whole currency units, as shown in the URL. */
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  sizes: string[];
  colors: string[];
  sort: CatalogSort;
  page: number;
};

/** "browse" = /products and /categories/[slug]; "search" = /search. */
export type CatalogMode = "browse" | "search";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export const DEFAULT_FILTERS: CatalogFilters = {
  inStock: false,
  sizes: [],
  colors: [],
  sort: DEFAULT_SORT,
  page: 1,
};

const MAX_PRICE_UNITS = 100_000;
const MAX_PAGE = 1_000;
const MAX_OPTION_VALUES = 20;

const querySchema = z.string().trim().min(1).max(100);
const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const priceSchema = z.coerce.number().int().min(0).max(MAX_PRICE_UNITS);
const pageSchema = z.coerce.number().int().min(1).max(MAX_PAGE);
const sortSchema = z.enum(SORT_OPTIONS);
const optionValueSchema = z.string().trim().min(1).max(40);

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function all(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function parseOptional<T>(schema: z.ZodType<T>, value: string | undefined): T | undefined {
  if (value === undefined) return undefined;
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

/** Valid, de-duplicated, sorted option values, so equivalent URLs are identical. */
function parseOptionValues(value: string | string[] | undefined): string[] {
  const valid = all(value).flatMap((raw) => {
    const result = optionValueSchema.safeParse(raw);
    return result.success ? [result.data] : [];
  });
  return [...new Set(valid)].sort((a, b) => a.localeCompare(b)).slice(0, MAX_OPTION_VALUES);
}

/**
 * Parses catalog search params. Invalid values are dropped rather than
 * rejected, so a hand-edited URL still renders a sensible page.
 */
export function parseCatalogParams(params: SearchParamsRecord): CatalogFilters {
  let minPrice = parseOptional(priceSchema, first(params.min));
  let maxPrice = parseOptional(priceSchema, first(params.max));
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  const inStockRaw = first(params.inStock);

  return {
    q: parseOptional(querySchema, first(params.q)),
    category: parseOptional(slugSchema, first(params.category)),
    minPrice,
    maxPrice,
    inStock: inStockRaw === "1" || inStockRaw === "true",
    sizes: parseOptionValues(params.size),
    colors: parseOptionValues(params.color),
    sort: parseOptional(sortSchema, first(params.sort)) ?? DEFAULT_SORT,
    page: parseOptional(pageSchema, first(params.page)) ?? 1,
  };
}

/** Converts URLSearchParams (client side) to the record shape Next passes to pages. */
export function searchParamsToRecord(params: URLSearchParams): SearchParamsRecord {
  const record: SearchParamsRecord = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    record[key] = values.length > 1 ? values : values[0];
  }
  return record;
}

type SerializeOptions = { includeCategory: boolean };

/**
 * Serializes filters to a canonical query string: fixed key order, sorted
 * multi-values, defaults omitted. Equal filters always give equal URLs.
 */
export function serializeCatalogParams(
  filters: CatalogFilters,
  options: SerializeOptions = { includeCategory: true },
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (options.includeCategory && filters.category) params.set("category", filters.category);
  if (filters.minPrice !== undefined) params.set("min", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("max", String(filters.maxPrice));
  if (filters.inStock) params.set("inStock", "1");
  for (const size of [...filters.sizes].sort((a, b) => a.localeCompare(b)))
    params.append("size", size);
  for (const color of [...filters.colors].sort((a, b) => a.localeCompare(b)))
    params.append("color", color);
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

/**
 * Builds the URL for a set of filters. In browse mode the category lives in
 * the path (/categories/[slug]); in search mode it stays a query param.
 */
export function buildCatalogHref(filters: CatalogFilters, mode: CatalogMode): string {
  if (mode === "search") {
    const query = serializeCatalogParams(filters);
    return query ? `/search?${query}` : "/search";
  }
  const path = filters.category ? `/categories/${filters.category}` : "/products";
  const query = serializeCatalogParams(filters, { includeCategory: false });
  return query ? `${path}?${query}` : path;
}

/** Returns filters with changes applied and pagination reset to page 1. */
export function updateFilters(
  filters: CatalogFilters,
  changes: Partial<CatalogFilters>,
): CatalogFilters {
  return { ...filters, page: 1, ...changes };
}

export function toggleValue(values: readonly string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function countActiveFilters(filters: CatalogFilters): number {
  return (
    (filters.minPrice !== undefined ? 1 : 0) +
    (filters.maxPrice !== undefined ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    filters.sizes.length +
    filters.colors.length
  );
}
