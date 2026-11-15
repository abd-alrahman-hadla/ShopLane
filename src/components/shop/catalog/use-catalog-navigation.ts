"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import {
  buildCatalogHref,
  type CatalogFilters,
  type CatalogMode,
} from "@/features/catalog/filters";

/**
 * Pushes a new filter state to the URL, which stays the source of truth.
 * The returned `filters` update optimistically, so checkboxes and the sort
 * select react on click instead of after the server render, and rapid clicks
 * build on each other.
 */
export function useCatalogNavigation(mode: CatalogMode, urlFilters: CatalogFilters) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filters, setOptimisticFilters] = useOptimistic(urlFilters);

  function navigate(next: CatalogFilters): void {
    startTransition(() => {
      setOptimisticFilters(next);
      router.push(buildCatalogHref(next, mode), { scroll: false });
    });
  }

  return { filters, navigate, isPending };
}
