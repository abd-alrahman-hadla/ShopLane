"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SORT_LABELS,
  SORT_OPTIONS,
  updateFilters,
  type CatalogFilters,
  type CatalogMode,
  type CatalogSort,
} from "@/features/catalog/filters";
import { useCatalogNavigation } from "./use-catalog-navigation";

function isSort(value: string): value is CatalogSort {
  return (SORT_OPTIONS as readonly string[]).includes(value);
}

export function SortSelect({
  filters: urlFilters,
  mode,
}: {
  filters: CatalogFilters;
  mode: CatalogMode;
}) {
  const { filters, navigate } = useCatalogNavigation(mode, urlFilters);

  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor="catalog-sort"
        className="text-muted-foreground hidden text-sm font-normal sm:block"
      >
        Sort by
      </Label>
      <Select
        value={filters.sort}
        onValueChange={(value) => {
          if (isSort(value)) navigate(updateFilters(filters, { sort: value }));
        }}
      >
        <SelectTrigger id="catalog-sort" aria-label="Sort products" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {SORT_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
