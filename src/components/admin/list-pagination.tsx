import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

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
  const t = useTranslations("admin.pagination");
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={t("label")} className="flex items-center gap-3 text-sm">
      {page > 1 && (
        <Link
          href={hrefFor(basePath, params, page - 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("previous")}
        </Link>
      )}
      <span className="text-muted-foreground">{t("pageOf", { page, pageCount })}</span>
      {page < pageCount && (
        <Link
          href={hrefFor(basePath, params, page + 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("next")}
        </Link>
      )}
    </nav>
  );
}
