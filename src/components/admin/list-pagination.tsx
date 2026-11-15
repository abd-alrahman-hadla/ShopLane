import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

type ListPaginationProps = {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageCount: number;
};

function hrefFor(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Previous/next links that keep the current filters (plain links, shareable). */
export function ListPagination({ basePath, params, page, pageCount }: ListPaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex items-center gap-3 text-sm">
      {page > 1 && (
        <Link
          href={hrefFor(basePath, params, page - 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Previous
        </Link>
      )}
      <span className="text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      {page < pageCount && (
        <Link
          href={hrefFor(basePath, params, page + 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Next
        </Link>
      )}
    </nav>
  );
}
