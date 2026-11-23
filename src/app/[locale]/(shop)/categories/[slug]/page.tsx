import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CatalogView } from "@/components/shop/catalog/catalog-view";
import { parseCatalogParams, type SearchParamsRecord } from "@/features/catalog/filters";
import {
  getCategories,
  getCategoryBySlug,
  getFacets,
  getProductList,
} from "@/features/catalog/queries";
import { alternatesFor } from "@/features/seo/alternates";
import { baseOpenGraphFor } from "@/features/seo/metadata";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<SearchParamsRecord>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { slug, locale } = (await params) as { slug: string; locale: Locale };
  const category = await getCategoryBySlug(slug, locale);
  if (!category) return {};
  const path = `/categories/${category.slug}`;
  return {
    title: category.name,
    description: category.description,
    alternates: alternatesFor(path, locale),
    openGraph: {
      ...baseOpenGraphFor(locale),
      url: getPathname({ href: path, locale }),
      title: category.name,
      description: category.description,
      ...(category.imageUrl && { images: [{ url: category.imageUrl, alt: category.name }] }),
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug, locale } = (await params) as { slug: string; locale: Locale };
  setRequestLocale(locale);
  const category = await getCategoryBySlug(slug, locale);
  if (!category) notFound();

  const filters = {
    ...parseCatalogParams(await searchParams),
    q: undefined,
    category: category.slug,
  };
  const [result, facets, categories] = await Promise.all([
    getProductList(filters, locale),
    getFacets({ category: category.slug }),
    getCategories(locale),
  ]);

  return (
    <CatalogView
      title={category.name}
      description={category.description}
      filters={filters}
      mode="browse"
      categories={categories}
      facets={facets}
      result={result}
    />
  );
}
