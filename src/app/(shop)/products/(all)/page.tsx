import type { Metadata } from "next";
import { CatalogView } from "@/components/shop/catalog/catalog-view";
import { parseCatalogParams, type SearchParamsRecord } from "@/features/catalog/filters";
import { getCategories, getFacets, getProductList } from "@/features/catalog/queries";

export const metadata: Metadata = {
  title: "Shop all",
  description: "Every coffee and piece of brewing gear in the ShopLane store.",
  alternates: { canonical: "/products" },
};

type PageProps = { searchParams: Promise<SearchParamsRecord> };

export default async function AllProductsPage({ searchParams }: PageProps) {
  // Category lives in the path in browse mode, so ignore a stray ?category=.
  const filters = { ...parseCatalogParams(await searchParams), q: undefined, category: undefined };
  const [result, facets, categories] = await Promise.all([
    getProductList(filters),
    getFacets({}),
    getCategories(),
  ]);

  return (
    <CatalogView
      title="Shop all"
      description="Coffee, brewers, grinders and everything in between."
      filters={filters}
      mode="browse"
      categories={categories}
      facets={facets}
      result={result}
    />
  );
}
