import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogView } from "@/components/shop/catalog/catalog-view";
import { SearchBox } from "@/components/shop/search-box";
import { parseCatalogParams, type SearchParamsRecord } from "@/features/catalog/filters";
import { getCategories, getFacets, getProductList } from "@/features/catalog/queries";
import type { Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParamsRecord>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "catalog" });
  const { q } = parseCatalogParams(await searchParams);
  return {
    title: q ? t("searchTitleFor", { query: q }) : t("searchTitle"),
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const filters = parseCatalogParams(await searchParams);
  const [t, result, facets, categories] = await Promise.all([
    getTranslations("catalog"),
    getProductList(filters, locale),
    getFacets({ q: filters.q, category: filters.category }),
    getCategories(locale),
  ]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <SearchBox key={filters.q} defaultValue={filters.q} className="max-w-md" />
      </div>
      <CatalogView
        title={filters.q ? t("resultsFor", { query: filters.q }) : t("searchTitle")}
        filters={filters}
        mode="search"
        categories={categories}
        facets={facets}
        result={result}
      />
    </>
  );
}
