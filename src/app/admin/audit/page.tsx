import type { Metadata } from "next";
import Link from "next/link";
import { ChangesTable } from "@/components/admin/audit-history";
import { ListPagination } from "@/components/admin/list-pagination";
import { getAuditLog } from "@/features/admin/audit";
import { requireAdminPage } from "@/features/admin/guard";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

const ENTITY_TYPES = ["Product", "Order", "Coupon", "User"] as const;
const timeFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" });

type PageProps = { searchParams: Promise<{ type?: string; page?: string }> };

function entityHref(entityType: string, entityId: string): string | null {
  if (entityType === "Product") return `/admin/products/${entityId}`;
  if (entityType === "Order") return `/admin/orders/${entityId}`;
  if (entityType === "Coupon") return "/admin/coupons";
  return null;
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  await requireAdminPage("/admin/audit");
  const params = await searchParams;
  const type = ENTITY_TYPES.find((entity) => entity === params.type);
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const {
    entries,
    total,
    pageCount,
    page: current,
  } = await getAuditLog(db, { entityType: type, page });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground text-sm">
          Every admin change, written in the same transaction as the change itself.
        </p>
      </header>
      <nav aria-label="Filter by record type" className="flex flex-wrap gap-2">
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
            {entity ? `${entity}s` : "All"}
          </Link>
        ))}
      </nav>
      <p className="text-muted-foreground text-sm">{total} entries</p>
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
                  <span className="text-muted-foreground ml-2 font-mono text-xs">
                    {entry.action}
                  </span>
                </span>
                <time
                  className="text-muted-foreground text-xs"
                  dateTime={entry.createdAt.toISOString()}
                >
                  {timeFormat.format(entry.createdAt)}
                </time>
              </div>
              <span className="text-muted-foreground text-xs">by {entry.actorEmail}</span>
              {entry.changes ? (
                <details>
                  <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                    Changes
                  </summary>
                  <ChangesTable changes={entry.changes} />
                </details>
              ) : null}
            </li>
          );
        })}
        {entries.length === 0 && (
          <li className="text-muted-foreground p-6 text-center text-sm">No entries yet.</li>
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
