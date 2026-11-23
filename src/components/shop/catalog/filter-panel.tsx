"use client";

import { Link } from "@/i18n/navigation";
import { IntentLink } from "@/components/intent-link";
import { useLocale, useTranslations } from "next-intl";
import { useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DEFAULT_FILTERS,
  buildCatalogHref,
  countActiveFilters,
  toggleValue,
  updateFilters,
  type CatalogFilters,
  type CatalogMode,
} from "@/features/catalog/filters";
import type { CatalogFacets, CategorySummary } from "@/features/catalog/types";
import { colorLabel, sizeLabel } from "@/features/catalog/variant-labels";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useCatalogNavigation } from "./use-catalog-navigation";

const SWATCHES: Record<string, string> = {
  Black: "#1f1d1b",
  White: "#ffffff",
  Steel: "#b9bcc1",
  Copper: "#b87333",
  Clear: "linear-gradient(135deg, #f3f4f6 0%, #ffffff 50%, #e5e7eb 100%)",
  Sage: "#9caf88",
  Clay: "#c4865f",
  Walnut: "#5c4033",
};

export type FilterPanelProps = {
  filters: CatalogFilters;
  mode: CatalogMode;
  categories: CategorySummary[];
  facets: CatalogFacets;
};

/** Keeps selected values visible even if the current scope no longer offers them. */
function withSelected(options: readonly string[], selected: readonly string[]): string[] {
  return [...options, ...selected.filter((value) => !options.includes(value))];
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-medium">{title}</legend>
      {children}
    </fieldset>
  );
}

function CategoryLinks({ filters, mode, categories }: Omit<FilterPanelProps, "facets">) {
  const t = useTranslations("catalog");
  // Sizes and colors differ per category, so switching category drops them.
  const hrefFor = (category: string | undefined) =>
    buildCatalogHref(updateFilters(filters, { category, sizes: [], colors: [] }), mode);

  return (
    <nav aria-label={t("filterByCategory")}>
      <ul className="flex flex-col gap-1.5 text-sm">
        <li>
          <IntentLink
            href={hrefFor(undefined)}
            aria-current={!filters.category ? "page" : undefined}
            className={cn(
              "hover:text-foreground text-muted-foreground",
              !filters.category && "text-foreground font-medium",
            )}
          >
            {t("allProducts")}
          </IntentLink>
        </li>
        {categories.map((category) => {
          const active = filters.category === category.slug;
          return (
            <li key={category.id}>
              <IntentLink
                href={hrefFor(category.slug)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "hover:text-foreground text-muted-foreground",
                  active && "text-foreground font-medium",
                )}
              >
                {category.name}
                <span className="text-muted-foreground ms-1 text-xs tabular-nums">
                  ({category.productCount})
                </span>
              </IntentLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PriceForm({
  filters,
  facets,
  onApply,
}: {
  filters: CatalogFilters;
  facets: CatalogFacets;
  onApply: (min?: number, max?: number) => void;
}) {
  const id = useId();
  const t = useTranslations("catalog");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parse = (key: string): number | undefined => {
      const raw = String(data.get(key) ?? "").trim();
      const value = Number(raw);
      return raw === "" || !Number.isFinite(value) || value < 0 ? undefined : Math.floor(value);
    };
    onApply(parse("min"), parse("max"));
  }

  return (
    // Key resets the inputs when the URL changes (e.g. "Clear all").
    <form
      key={`${filters.minPrice}-${filters.maxPrice}`}
      onSubmit={handleSubmit}
      className="flex items-end gap-2"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor={`${id}-min`} className="text-muted-foreground text-xs">
          {t("minPrice")}
        </Label>
        <Input
          id={`${id}-min`}
          name="min"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={filters.minPrice}
          placeholder={facets.priceMin?.toString() ?? "0"}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor={`${id}-max`} className="text-muted-foreground text-xs">
          {t("maxPrice")}
        </Label>
        <Input
          id={`${id}-max`}
          name="max"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={filters.maxPrice}
          placeholder={facets.priceMax?.toString() ?? ""}
        />
      </div>
      <Button type="submit" variant="outline">
        {t("apply")}
      </Button>
    </form>
  );
}

function OptionCheckboxes({
  name,
  options,
  selected,
  onToggle,
  swatches = false,
  label,
}: {
  name: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  swatches?: boolean;
  /** Display text for a value; the URL keeps the stored (English) value. */
  label: (value: string) => string;
}) {
  const id = useId();
  return (
    <ul className="flex flex-col gap-2.5">
      {options.map((option, index) => {
        const inputId = `${id}-${index}`;
        const swatch = SWATCHES[option];
        return (
          <li key={option} className="flex items-center gap-2.5">
            <Checkbox
              id={inputId}
              name={name}
              value={option}
              checked={selected.includes(option)}
              onCheckedChange={() => onToggle(option)}
            />
            <Label htmlFor={inputId} className="flex items-center gap-2 font-normal">
              {swatches && swatch && (
                <span
                  aria-hidden
                  className="size-3.5 rounded-full border"
                  style={{ background: swatch }}
                />
              )}
              {label(option)}
            </Label>
          </li>
        );
      })}
    </ul>
  );
}

export function FilterPanel({ filters: urlFilters, mode, categories, facets }: FilterPanelProps) {
  const { filters, navigate, isPending } = useCatalogNavigation(mode, urlFilters);
  const t = useTranslations("catalog");
  const locale = useLocale() as Locale;
  const inStockId = useId();
  const sizes = withSelected(facets.sizes, filters.sizes);
  const colors = withSelected(facets.colors, filters.colors);
  const clearHref = buildCatalogHref(
    { ...DEFAULT_FILTERS, q: filters.q, category: filters.category, sort: filters.sort },
    mode,
  );
  const activeCount = countActiveFilters(filters);

  return (
    <div
      className={cn("flex flex-col gap-6 transition-opacity", isPending && "opacity-60")}
      aria-busy={isPending}
    >
      <FilterSection title={t("category")}>
        <CategoryLinks filters={filters} mode={mode} categories={categories} />
      </FilterSection>
      <Separator />
      <FilterSection title={t("price")}>
        <PriceForm
          filters={filters}
          facets={facets}
          onApply={(minPrice, maxPrice) => navigate(updateFilters(filters, { minPrice, maxPrice }))}
        />
      </FilterSection>
      <Separator />
      <FilterSection title={t("availability")}>
        <div className="flex items-center gap-2.5">
          <Checkbox
            id={inStockId}
            checked={filters.inStock}
            onCheckedChange={(checked) =>
              navigate(updateFilters(filters, { inStock: checked === true }))
            }
          />
          <Label htmlFor={inStockId} className="font-normal">
            {t("inStockOnly")}
          </Label>
        </div>
      </FilterSection>
      {sizes.length > 0 && (
        <>
          <Separator />
          <FilterSection title={t("size")}>
            <OptionCheckboxes
              name="size"
              options={sizes}
              label={(value) => sizeLabel(value, locale)}
              selected={filters.sizes}
              onToggle={(value) =>
                navigate(updateFilters(filters, { sizes: toggleValue(filters.sizes, value) }))
              }
            />
          </FilterSection>
        </>
      )}
      {colors.length > 0 && (
        <>
          <Separator />
          <FilterSection title={t("color")}>
            <OptionCheckboxes
              name="color"
              options={colors}
              label={(value) => colorLabel(value, locale)}
              selected={filters.colors}
              swatches
              onToggle={(value) =>
                navigate(updateFilters(filters, { colors: toggleValue(filters.colors, value) }))
              }
            />
          </FilterSection>
        </>
      )}
      {activeCount > 0 && (
        <>
          <Separator />
          <Link href={clearHref} scroll={false} className="text-sm underline underline-offset-4">
            {t("clearAll", { count: activeCount })}
          </Link>
        </>
      )}
    </div>
  );
}
