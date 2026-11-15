import { unstable_cache } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { ratingSummary } from "@/features/reviews/rating";
import { db } from "@/lib/db";
import { CATALOG_TAGS } from "./cache";
import type { CatalogFilters } from "./filters";
import { toProductCard } from "./mappers";
import { computeFacets } from "./options";
import type {
  CatalogFacets,
  CategorySummary,
  ProductCardData,
  ProductDetail,
  ProductListResult,
} from "./types";
import { buildOrderBy, buildProductWhere, buildScopeWhere, getPageWindow } from "./where";

/** Fallback time-based revalidation; tags purge sooner on admin edits. */
const REVALIDATE_SECONDS = 3600;

export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  minPriceCents: true,
  maxPriceCents: true,
  ratingSum: true,
  ratingCount: true,
  category: { select: { name: true } },
  images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
  variants: { select: { priceCents: true, compareAtPriceCents: true, stock: true } },
} satisfies Prisma.ProductSelect;

export const getProductList = unstable_cache(
  async (filters: CatalogFilters): Promise<ProductListResult> => {
    const where = buildProductWhere(filters);
    const total = await db.product.count({ where });
    const window = getPageWindow(filters.page, total);
    const rows = await db.product.findMany({
      where,
      orderBy: buildOrderBy(filters.sort),
      skip: window.skip,
      take: window.take,
      select: productCardSelect,
    });
    return {
      items: rows.map(toProductCard),
      total,
      page: window.page,
      pageCount: window.pageCount,
    };
  },
  ["catalog:product-list"],
  { tags: [CATALOG_TAGS.products], revalidate: REVALIDATE_SECONDS },
);

export const getFacets = unstable_cache(
  async (scope: Pick<CatalogFilters, "q" | "category">): Promise<CatalogFacets> => {
    const variants = await db.variant.findMany({
      where: { product: buildScopeWhere(scope) },
      select: { size: true, color: true, priceCents: true },
    });
    return computeFacets(variants);
  },
  ["catalog:facets"],
  { tags: [CATALOG_TAGS.products], revalidate: REVALIDATE_SECONDS },
);

export const getCategories = unstable_cache(
  async (): Promise<CategorySummary[]> => {
    const rows = await db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
    });
    return rows.map(({ _count, ...category }) => ({ ...category, productCount: _count.products }));
  },
  ["catalog:categories"],
  { tags: [CATALOG_TAGS.categories, CATALOG_TAGS.products], revalidate: REVALIDATE_SECONDS },
);

export async function getCategoryBySlug(slug: string): Promise<CategorySummary | null> {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

export const getFeaturedProducts = unstable_cache(
  async (limit: number = 8): Promise<ProductCardData[]> => {
    const rows = await db.product.findMany({
      where: { status: "ACTIVE", featured: true },
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
      take: limit,
      select: productCardSelect,
    });
    return rows.map(toProductCard);
  },
  ["catalog:featured"],
  { tags: [CATALOG_TAGS.products], revalidate: REVALIDATE_SECONDS },
);

export const getActiveProductSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true } });
    return rows.map((row) => row.slug);
  },
  ["catalog:active-slugs"],
  { tags: [CATALOG_TAGS.products], revalidate: REVALIDATE_SECONDS },
);

async function loadProductDetail(slug: string): Promise<ProductDetail | null> {
  const row = await db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: { select: { slug: true, name: true } },
      variants: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          sku: true,
          title: true,
          size: true,
          color: true,
          priceCents: true,
          compareAtPriceCents: true,
          stock: true,
        },
      },
      images: {
        orderBy: { position: "asc" },
        select: { id: true, url: true, alt: true, variantId: true },
      },
      ratingSum: true,
      ratingCount: true,
      seoTitle: true,
      seoDescription: true,
    },
  });
  if (!row) return null;
  const { ratingSum, ratingCount, ...product } = row;
  return { ...product, rating: ratingSummary(ratingSum, ratingCount) };
}

/** Product detail, cached per slug and purged by `product:<slug>` or `products`. */
export function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  return unstable_cache(() => loadProductDetail(slug), ["catalog:product", slug], {
    tags: [CATALOG_TAGS.products, CATALOG_TAGS.product(slug)],
    revalidate: REVALIDATE_SECONDS,
  })();
}
