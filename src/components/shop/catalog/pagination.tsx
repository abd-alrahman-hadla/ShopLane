import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
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
  if (pageCount <= 1) return null;
  const hrefFor = (target: number) => buildCatalogHref({ ...filters, page: target }, mode);
  const linkClass = buttonVariants({ variant: "outline", size: "icon" });

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass} aria-label="Previous page" rel="prev">
          <ChevronLeftIcon />
        </Link>
      ) : (
        <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronLeftIcon />
        </span>
      )}
      {getPageItems(page, pageCount).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="text-muted-foreground px-1">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={`Page ${item}`}
            className={buttonVariants({
              variant: item === page ? "default" : "ghost",
              size: "icon",
            })}
          >
            {item}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={linkClass} aria-label="Next page" rel="next">
          <ChevronRightIcon />
        </Link>
      ) : (
        <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronRightIcon />
        </span>
      )}
    </nav>
  );
}
