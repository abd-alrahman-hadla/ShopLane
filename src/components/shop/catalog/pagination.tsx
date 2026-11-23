import { IntentLink } from "@/components/intent-link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import {
  buildCatalogHref,
  type CatalogFilters,
  type CatalogMode,
} from "@/features/catalog/filters";
import { cn } from "@/lib/utils";

type PaginationProps = {
  filters: CatalogFilters;
  mode: CatalogMode;
  page: number;
  pageCount: number;
};

/** Page numbers to show: first, last, and a window around the current page. */
export function getPageItems(page: number, pageCount: number): Array<number | "gap"> {
  const pages = new Set(
    [1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount),
  );
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, index) => {
    const previous = sorted[index - 1];
    return previous !== undefined && p - previous > 1 ? (["gap", p] as const) : [p];
  });
}

/** Real links, so every page is shareable and crawlable. */
export function Pagination({ filters, mode, page, pageCount }: PaginationProps) {
  const t = useTranslations("catalog");
  if (pageCount <= 1) return null;
  const hrefFor = (target: number) => buildCatalogHref({ ...filters, page: target }, mode);
  const linkClass = buttonVariants({ variant: "outline", size: "icon" });

  return (
    <nav aria-label={t("pagination")} className="flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <IntentLink
          href={hrefFor(page - 1)}
          className={linkClass}
          aria-label={t("previousPage")}
          rel="prev"
        >
          <ChevronLeftIcon className="rtl:-scale-x-100" />
        </IntentLink>
      ) : (
        <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronLeftIcon className="rtl:-scale-x-100" />
        </span>
      )}
      {getPageItems(page, pageCount).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="text-muted-foreground px-1">
            …
          </span>
        ) : (
          <IntentLink
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={t("page", { page: item })}
            className={buttonVariants({
              variant: item === page ? "default" : "ghost",
              size: "icon",
            })}
          >
            {item}
          </IntentLink>
        ),
      )}
      {page < pageCount ? (
        <IntentLink
          href={hrefFor(page + 1)}
          className={linkClass}
          aria-label={t("nextPage")}
          rel="next"
        >
          <ChevronRightIcon className="rtl:-scale-x-100" />
        </IntentLink>
      ) : (
        <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronRightIcon className="rtl:-scale-x-100" />
        </span>
      )}
    </nav>
  );
}
