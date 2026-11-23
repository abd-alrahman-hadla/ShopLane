import type { Prisma } from "@/generated/prisma/client";
import { unitsToCents } from "@/lib/money";
import type { CatalogFilters, CatalogSort } from "./filters";

type ScopeFilters = Pick<CatalogFilters, "q" | "category">;

/**
 * Case-insensitive match on name, description and SKU. Category names are
 * deliberately excluded: "kettle" should not return every grinder just because
 * the category is "Grinders & Kettles".
 */
function buildSearchCondition(q: string): Prisma.ProductWhereInput {
  const contains = { contains: q, mode: "insensitive" } as const;
  return {
    OR: [
      { name: contains },
      { description: contains },
      { variants: { some: { sku: contains } } },
      // Translated names and descriptions (e.g. searching in Arabic).
      { translations: { some: { OR: [{ name: contains }, { description: contains }] } } },
    ],
  };
}

/** Conditions shared by the product list and the facets: active products in scope. */
export function buildScopeWhere(filters: ScopeFilters): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }];
  if (filters.category) and.push({ category: { slug: filters.category } });
  if (filters.q) and.push(buildSearchCondition(filters.q));
  return { AND: and };
}

/**
 * All variant-level filters go into ONE `some` clause, so a single variant must
 * match all of them: "a 1 kg bag that is in stock and under $40", not
 * "has a 1 kg bag and has something in stock".
 */
export function buildVariantWhere(filters: CatalogFilters): Prisma.VariantWhereInput | undefined {
  const where: Prisma.VariantWhereInput = {};
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.priceCents = {
      ...(filters.minPrice !== undefined && { gte: unitsToCents(filters.minPrice) }),
      ...(filters.maxPrice !== undefined && { lte: unitsToCents(filters.maxPrice) }),
    };
  }
  if (filters.inStock) where.stock = { gt: 0 };
  if (filters.sizes.length > 0) where.size = { in: filters.sizes };
  if (filters.colors.length > 0) where.color = { in: filters.colors };
  return Object.keys(where).length > 0 ? where : undefined;
}

export function buildProductWhere(filters: CatalogFilters): Prisma.ProductWhereInput {
  const scope = buildScopeWhere(filters);
  const variantWhere = buildVariantWhere(filters);
  if (!variantWhere) return scope;
  return { AND: [scope, { variants: { some: variantWhere } }] };
}

/** Every ordering ends with `id` so pagination is stable. */
export function buildOrderBy(sort: CatalogSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "featured":
      return [{ featured: "desc" }, { createdAt: "desc" }, { name: "asc" }, { id: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }, { name: "asc" }, { id: "asc" }];
    case "price-asc":
      return [{ minPriceCents: "asc" }, { name: "asc" }, { id: "asc" }];
    case "price-desc":
      return [{ minPriceCents: "desc" }, { name: "asc" }, { id: "asc" }];
    case "name":
      return [{ name: "asc" }, { id: "asc" }];
  }
}

export const PAGE_SIZE = 12;

export type PageWindow = { page: number; pageCount: number; skip: number; take: number };

/** Clamps the requested page into range for a given total. */
export function getPageWindow(
  requestedPage: number,
  total: number,
  pageSize: number = PAGE_SIZE,
): PageWindow {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  return { page, pageCount, skip: (page - 1) * pageSize, take: pageSize };
}
