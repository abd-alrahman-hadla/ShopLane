import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChangesTable } from "@/components/admin/audit-history";
import { ListPagination } from "@/components/admin/list-pagination";
import { getAuditLog } from "@/features/admin/audit";
import { requireAdminPage } from "@/features/admin/guard";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const ENTITY_TYPES = ["Product", "Order", "Coupon", "User", "Store"] as const;

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; page?: string }>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "admin.audit" });
  return { title: t("title") };
}

function entityHref(entityType: string, entityId: string): string | null {
  if (entityType === "Product") return `/admin/products/${entityId}`;
  if (entityType === "Order") return `/admin/orders/${entityId}`;
  if (entityType === "Coupon") return "/admin/coupons";
  return null;
}

export default async function AuditLogPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t] = await Promise.all([getTranslations("admin.audit"), requireAdminPage("/admin/audit")]);
  const query = await searchParams;
  const type = ENTITY_TYPES.find((entity) => entity === query.type);
  const page = Number.parseInt(query.page ?? "1", 10) || 1;
  const {
    entries,
    total,
    pageCount,
    page: current,
  } = await getAuditLog(db, { entityType: type, page });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("lead")}</p>
      </header>
      <nav aria-label={t("filter")} className="flex flex-wrap gap-2">
        {[undefined, ...ENTITY_TYPES].map((entity) => (
          <Link
            key={entity ?? "all"}
            href={entity ? `/admin/audit?type=${entity}` : "/admin/audit"}
            aria-current={type === entity ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              type === entity
                ? "bg-secondary font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`types.${entity ?? "all"}`)}
          </Link>
        ))}
      </nav>
      <p className="text-muted-foreground text-sm">{t("entries", { count: total })}</p>
      <ol className="bg-card divide-y rounded-xl border" data-testid="audit-log">
        {entries.map((entry) => {
          const href = entityHref(entry.entityType, entry.entityId);
          return (
            <li key={entry.id} className="flex flex-col gap-1 p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  {href ? (
                    <Link href={href} className="font-medium hover:underline">
                      {entry.summary}
                    </Link>
                  ) : (
                    <span className="font-medium">{entry.summary}</span>
                  )}
                  <span className="text-muted-foreground ms-2 font-mono text-xs" dir="ltr">
                    {entry.action}
                  </span>
                </span>
                <time
                  className="text-muted-foreground text-xs"
                  dateTime={entry.createdAt.toISOString()}
                >
                  {formatDate(entry.createdAt, locale, "dateTime")}
                </time>
              </div>
              <span className="text-muted-foreground text-xs">
                {t("by")} <span dir="ltr">{entry.actorEmail}</span>
              </span>
              {entry.changes ? (
                <details>
                  <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                    {t("changes")}
                  </summary>
                  <ChangesTable changes={entry.changes} />
                </details>
              ) : null}
            </li>
          );
        })}
        {entries.length === 0 && (
          <li className="text-muted-foreground p-6 text-center text-sm">{t("none")}</li>
        )}
      </ol>
      <ListPagination
        basePath="/admin/audit"
        params={{ type }}
        page={current}
        pageCount={pageCount}
      />
    </div>
  );
}
