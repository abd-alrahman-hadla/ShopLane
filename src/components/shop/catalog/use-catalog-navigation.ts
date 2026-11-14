"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  buildCatalogHref,
  type CatalogFilters,
  type CatalogMode,
} from "@/features/catalog/filters";

/** Pushes a new filter state to the URL, which is the single source of truth. */
export function useCatalogNavigation(mode: CatalogMode) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(filters: CatalogFilters): void {
    startTransition(() => {
      router.push(buildCatalogHref(filters, mode), { scroll: false });
    });
  }

  return { navigate, isPending };
}
