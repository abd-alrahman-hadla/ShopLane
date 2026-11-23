import { unstable_cache } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { ratingSummary } from "@/features/reviews/rating";
import { db } from "@/lib/db";
import type { Locale } from "@/i18n/routing";
import { CATALOG_TAGS } from "./cache";
import type { CatalogFilters } from "./filters";
import { localizeContent, translationsFor } from "./localize";
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

/** Card fields plus the locale's translated product and category names. */
export function productCardSelect(locale: Locale) {
  return {
    id: true,
    slug: true,
    name: true,
    minPriceCents: true,
    maxPriceCents: true,
    ratingSum: true,
    ratingCount: true,
    category: { select: { name: true, translations: translationsFor(locale, { name: true }) } },
    translations: translationsFor(locale, { name: true }),
    images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
    variants: { select: { priceCents: true, compareAtPriceCents: true, stock: true } },
  } satisfies Prisma.ProductSelect;
}

export const getProductList = unstable_cache(
  async (filters: CatalogFilters, locale: Locale): Promise<ProductListResult> => {
    const where = buildProductWhere(filters);
    const total = await db.product.count({ where });
    const window = getPageWindow(filters.page, total);
    const rows = await db.product.findMany({
      where,
      orderBy: buildOrderBy(filters.sort),
      skip: window.skip,
      take: window.take,
      select: productCardSelect(locale),
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
  async (locale: Locale): Promise<CategorySummary[]> => {
    const rows = await db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        translations: translationsFor(locale, { name: true, description: true }),
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
    });
    return rows.map(({ _count, translations, ...category }) => ({
      ...localizeContent(category, translations[0]),
      productCount: _count.products,
    }));
  },
  ["catalog:categories"],
  { tags: [CATALOG_TAGS.categories, CATALOG_TAGS.products], revalidate: REVALIDATE_SECONDS },
);

export async function getCategoryBySlug(
  slug: string,
  locale: Locale,
): Promise<CategorySummary | null> {
  const categories = await getCategories(locale);
  return categories.find((category) => category.slug === slug) ?? null;
}

export const getFeaturedProducts = unstable_cache(
  async (limit: number, locale: Locale): Promise<ProductCardData[]> => {
    const rows = await db.product.findMany({
      where: { status: "ACTIVE", featured: true },
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
      take: limit,
      select: productCardSelect(locale),
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

async function loadProductDetail(slug: string, locale: Locale): Promise<ProductDetail | null> {
  const row = await db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: {
        select: { slug: true, name: true, translations: translationsFor(locale, { name: true }) },
      },
      translations: translationsFor(locale, {
        name: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
      }),
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
  const { ratingSum, ratingCount, translations, category, ...product } = row;
  const { translations: categoryTranslations, ...categoryBase } = category;
  return {
    ...localizeContent(product, translations[0]),
    category: localizeContent(categoryBase, categoryTranslations[0]),
    rating: ratingSummary(ratingSum, ratingCount),
  };
}

/** Product detail per slug and locale, purged by `product:<slug>` or `products` (all locales). */
export function getProductBySlug(slug: string, locale: Locale): Promise<ProductDetail | null> {
  return unstable_cache(() => loadProductDetail(slug, locale), ["catalog:product", slug, locale], {
    tags: [CATALOG_TAGS.products, CATALOG_TAGS.product(slug)],
    revalidate: REVALIDATE_SECONDS,
  })();
}

export type SitemapRecord = { path: string; updatedAt: string };

/** Indexable catalog URLs: every category and every ACTIVE product (ISO dates, cache-safe). */
export const getSitemapRecords = unstable_cache(
  async (): Promise<SitemapRecord[]> => {
    const [categories, products] = await Promise.all([
      db.category.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { sortOrder: "asc" },
      }),
      db.product.findMany({
        where: { status: "ACTIVE" },
        select: { slug: true, updatedAt: true },
        orderBy: { slug: "asc" },
      }),
    ]);
    return [
      ...categories.map((row) => ({
        path: `/categories/${row.slug}`,
        updatedAt: row.updatedAt.toISOString(),
      })),
      ...products.map((row) => ({
        path: `/products/${row.slug}`,
        updatedAt: row.updatedAt.toISOString(),
      })),
    ];
  },
  ["catalog:sitemap"],
  { tags: [CATALOG_TAGS.categories, CATALOG_TAGS.products], revalidate: REVALIDATE_SECONDS },
);
