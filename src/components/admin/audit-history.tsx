import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { getAuditLog } from "@/features/admin/audit";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length === 0 ? "—" : value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ChangesTable({ changes }: { changes: unknown }) {
  const t = useTranslations("admin.audit");
  if (!changes || typeof changes !== "object") return null;
  const entries = Object.entries(changes as Record<string, [unknown, unknown]>);
  if (entries.length === 0) return null;
  return (
    <table className="mt-2 w-full text-xs">
      <thead className="text-muted-foreground text-start">
        <tr>
          <th scope="col" className="pe-2 text-start font-normal">
            {t("field")}
          </th>
          <th scope="col" className="pe-2 text-start font-normal">
            {t("before")}
          </th>
          <th scope="col" className="text-start font-normal">
            {t("after")}
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([field, pair]) => (
          <tr key={field} className="border-t align-top">
            <td className="py-1 pe-2 font-medium">{field}</td>
            <td className="text-muted-foreground max-w-48 py-1 pe-2 break-words">
              {formatValue(pair?.[0])}
            </td>
            <td className="max-w-48 py-1 break-words">{formatValue(pair?.[1])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Recent audit entries for one record (product, order, coupon). */
export async function AuditHistory({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const [{ entries }, t, locale] = await Promise.all([
    getAuditLog(db, { entityType, entityId }),
    getTranslations("admin.audit"),
    getLocale() as Promise<Locale>,
  ]);
  return (
    <section aria-labelledby="history-heading" className="bg-card rounded-xl border p-4">
      <h2 id="history-heading" className="mb-3 font-medium">
        {t("history")}
      </h2>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noChanges")}</p>
      ) : (
        <ol className="flex flex-col gap-3 text-sm" data-testid="audit-history">
          {entries.slice(0, 20).map((entry) => (
            <li key={entry.id} className="border-s-2 ps-3">
              <p>{entry.summary}</p>
              <p className="text-muted-foreground text-xs">
                <span dir="ltr">{entry.actorEmail}</span> ·{" "}
                <time dateTime={entry.createdAt.toISOString()}>
                  {formatDate(entry.createdAt, locale, "dateTime")}
                </time>
              </p>
              {entry.changes ? (
                <details className="mt-1">
                  <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                    {t("changes")}
                  </summary>
                  <ChangesTable changes={entry.changes} />
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
