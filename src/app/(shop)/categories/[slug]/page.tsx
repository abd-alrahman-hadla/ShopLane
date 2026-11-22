import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { baseOpenGraph } from "@/features/seo/metadata";
import { CatalogView } from "@/components/shop/catalog/catalog-view";
import { parseCatalogParams, type SearchParamsRecord } from "@/features/catalog/filters";
import {
  getCategories,
  getCategoryBySlug,
  getFacets,
  getProductList,
} from "@/features/catalog/queries";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParamsRecord>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: {
      ...baseOpenGraph,
      url: `/categories/${category.slug}`,
      title: category.name,
      description: category.description,
      ...(category.imageUrl && { images: [{ url: category.imageUrl, alt: category.name }] }),
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const filters = {
    ...parseCatalogParams(await searchParams),
    q: undefined,
    category: category.slug,
  };
  const [result, facets, categories] = await Promise.all([
    getProductList(filters),
    getFacets({ category: category.slug }),
    getCategories(),
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
