"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { countActiveFilters } from "@/features/catalog/filters";
import { directionOf, type Locale } from "@/i18n/routing";
import { FilterPanel, type FilterPanelProps } from "./filter-panel";

export function MobileFilters(props: FilterPanelProps) {
  const activeCount = countActiveFilters(props.filters);
  const t = useTranslations("catalog");
  // The panel slides in from the start edge (left in English, right in Arabic).
  const side = directionOf(useLocale() as Locale) === "rtl" ? "right" : "left";
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontalIcon data-icon="inline-start" />
          {activeCount > 0 ? t("filtersCount", { count: activeCount }) : t("filters")}
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("filters")}</SheetTitle>
          <SheetDescription>{t("filtersHint")}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <FilterPanel {...props} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
