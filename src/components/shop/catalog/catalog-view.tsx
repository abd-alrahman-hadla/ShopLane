import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
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

function resultSummary({ total, page, pageCount }: ProductListResult): string {
  const noun = total === 1 ? "product" : "products";
  return pageCount > 1 ? `${total} ${noun} · page ${page} of ${pageCount}` : `${total} ${noun}`;
}

export function CatalogView({
  title,
  description,
  filters,
  mode,
  categories,
  facets,
  result,
}: CatalogViewProps) {
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
        <aside className="hidden lg:block" aria-label="Filters">
          <FilterPanel {...panelProps} />
        </aside>
        <section aria-label="Products" className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MobileFilters {...panelProps} />
              <p
                className="text-muted-foreground text-sm"
                data-testid="result-summary"
                aria-live="polite"
              >
                {resultSummary(result)}
              </p>
            </div>
            <SortSelect filters={filters} mode={mode} />
          </div>
          {result.items.length > 0 ? (
            <ProductGrid products={result.items} priorityCount={3} />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
              <p className="font-medium">No products match these filters.</p>
              <Link href={resetHref} className="text-sm underline underline-offset-4">
                Clear filters
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

export function CatalogSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" aria-busy="true">
      <Skeleton className="mb-8 h-9 w-64" />
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
        <div className="hidden flex-col gap-4 lg:flex">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-5 w-40" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex flex-col gap-3">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
