import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  buildCatalogHref,
  DEFAULT_FILTERS,
  type CatalogFilters,
  type CatalogMode,
} from "@/features/catalog/filters";
import type { CatalogFacets, CategorySummary, ProductListResult } from "@/features/catalog/types";
import { ProductGrid } from "../product-grid";
import { FilterPanel } from "./filter-panel";
import { MobileFilters } from "./mobile-filters";
import { Pagination } from "./pagination";
import { SortSelect } from "./sort-select";

type CatalogViewProps = {
  title: string;
  description?: string;
  filters: CatalogFilters;
  mode: CatalogMode;
  categories: CategorySummary[];
  facets: CatalogFacets;
  result: ProductListResult;
};

export function CatalogView({
  title,
  description,
  filters,
  mode,
  categories,
  facets,
  result,
}: CatalogViewProps) {
  const t = useTranslations("catalog");
  const panelProps = { filters, mode, categories, facets };
  const resetHref = buildCatalogHref(
    { ...DEFAULT_FILTERS, q: filters.q, category: filters.category },
    mode,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground max-w-2xl">{description}</p>}
      </header>
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block" aria-label={t("filters")}>
          <FilterPanel {...panelProps} />
        </aside>
        <section aria-label={t("products")} className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MobileFilters {...panelProps} />
              <p
                className="text-muted-foreground text-sm"
                data-testid="result-summary"
                aria-live="polite"
              >
                {result.pageCount > 1
                  ? t("summaryPaged", {
                      count: result.total,
                      page: result.page,
                      pageCount: result.pageCount,
                    })
                  : t("summary", { count: result.total })}
              </p>
            </div>
            <SortSelect filters={filters} mode={mode} />
          </div>
          {result.items.length > 0 ? (
            <ProductGrid products={result.items} priorityCount={3} />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
              <p className="font-medium">{t("noMatches")}</p>
              <Link href={resetHref} className="text-sm underline underline-offset-4">
                {t("clearFilters")}
              </Link>
            </div>
          )}
          <Pagination
            filters={filters}
            mode={mode}
            page={result.page}
            pageCount={result.pageCount}
          />
        </section>
      </div>
    </div>
  );
}
