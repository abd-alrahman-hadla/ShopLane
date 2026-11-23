import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogView } from "@/components/shop/catalog/catalog-view";
import { parseCatalogParams, type SearchParamsRecord } from "@/features/catalog/filters";
import { getCategories, getFacets, getProductList } from "@/features/catalog/queries";
import { alternatesFor } from "@/features/seo/alternates";
import { baseOpenGraphFor } from "@/features/seo/metadata";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParamsRecord>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return {
    title: t("allTitle"),
    description: t("allMetaDescription"),
    alternates: alternatesFor("/products", locale),
    openGraph: {
      ...baseOpenGraphFor(locale),
      url: getPathname({ href: "/products", locale }),
      title: t("allTitle"),
    },
  };
}

export default async function AllProductsPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  // Category lives in the path in browse mode, so ignore a stray ?category=.
  const filters = { ...parseCatalogParams(await searchParams), q: undefined, category: undefined };
  const [t, result, facets, categories] = await Promise.all([
    getTranslations("catalog"),
    getProductList(filters, locale),
    getFacets({}),
    getCategories(locale),
  ]);

  return (
    <CatalogView
      title={t("allTitle")}
      description={t("allDescription")}
      filters={filters}
      mode="browse"
      categories={categories}
      facets={facets}
      result={result}
    />
  );
}
