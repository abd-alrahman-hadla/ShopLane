import { getAuditLog } from "@/features/admin/audit";
import { db } from "@/lib/db";

const timeFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length === 0 ? "—" : value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ChangesTable({ changes }: { changes: unknown }) {
  if (!changes || typeof changes !== "object") return null;
  const entries = Object.entries(changes as Record<string, [unknown, unknown]>);
  if (entries.length === 0) return null;
  return (
    <table className="mt-2 w-full text-xs">
      <thead className="text-muted-foreground text-left">
        <tr>
          <th scope="col" className="pr-2 font-normal">
            Field
          </th>
          <th scope="col" className="pr-2 font-normal">
            Before
          </th>
          <th scope="col" className="font-normal">
            After
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([field, pair]) => (
          <tr key={field} className="border-t align-top">
            <td className="py-1 pr-2 font-medium">{field}</td>
            <td className="text-muted-foreground max-w-48 py-1 pr-2 break-words">
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
  const { entries } = await getAuditLog(db, { entityType, entityId });
  return (
    <section aria-labelledby="history-heading" className="bg-card rounded-xl border p-4">
      <h2 id="history-heading" className="mb-3 font-medium">
        History
      </h2>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">No admin changes yet.</p>
      ) : (
        <ol className="flex flex-col gap-3 text-sm" data-testid="audit-history">
          {entries.slice(0, 20).map((entry) => (
            <li key={entry.id} className="border-l-2 pl-3">
              <p>{entry.summary}</p>
              <p className="text-muted-foreground text-xs">
                {entry.actorEmail} ·{" "}
                <time dateTime={entry.createdAt.toISOString()}>
                  {timeFormat.format(entry.createdAt)}
                </time>
              </p>
              {entry.changes ? (
                <details className="mt-1">
                  <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                    Changes
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
