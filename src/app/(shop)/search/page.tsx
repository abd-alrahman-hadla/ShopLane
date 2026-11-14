import type { Metadata } from "next";
import { CatalogView } from "@/components/shop/catalog/catalog-view";
import { SearchBox } from "@/components/shop/search-box";
import { parseCatalogParams, type SearchParamsRecord } from "@/features/catalog/filters";
import { getCategories, getFacets, getProductList } from "@/features/catalog/queries";

type PageProps = { searchParams: Promise<SearchParamsRecord> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = parseCatalogParams(await searchParams);
  return {
    title: q ? `Search: ${q}` : "Search",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const filters = parseCatalogParams(await searchParams);
  const [result, facets, categories] = await Promise.all([
    getProductList(filters),
    getFacets({ q: filters.q, category: filters.category }),
    getCategories(),
  ]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <SearchBox key={filters.q} defaultValue={filters.q} className="max-w-md" />
      </div>
      <CatalogView
        title={filters.q ? `Results for “${filters.q}”` : "Search"}
        filters={filters}
        mode="search"
        categories={categories}
        facets={facets}
        result={result}
      />
    </>
  );
}
