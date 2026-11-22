import type { Prisma } from "@/generated/prisma/client";
import type { DbClient } from "@/features/cart/quote";

export type FieldChanges = Record<string, [unknown, unknown]>;

export type AuditEntry = {
  action: string;
  entityType: "Product" | "Order" | "Coupon" | "User" | "Store";
  entityId: string;
  summary: string;
  changes?: FieldChanges | null;
};

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  return value;
}

function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

/**
 * Field-level diff for the audit log: only fields whose value changed, as
 * [before, after]. Dates become ISO strings so the result is plain JSON.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: Partial<T> | null,
  after: Partial<T>,
  fields: ReadonlyArray<keyof T & string>,
): FieldChanges {
  const changes: FieldChanges = {};
  for (const field of fields) {
    const previous = before ? before[field] : null;
    const next = after[field];
    if (!isEqual(previous, next)) changes[field] = [normalize(previous), normalize(next)];
  }
  return changes;
}

export async function writeAudit(
  tx: DbClient,
  actor: { id: string | null; email: string },
  entry: AuditEntry,
): Promise<void> {
  const changes = entry.changes && Object.keys(entry.changes).length > 0 ? entry.changes : null;
  await tx.auditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      changes: (changes ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export const AUDIT_PAGE_SIZE = 50;

export async function getAuditLog(
  db: DbClient,
  options: { entityType?: string; entityId?: string; page?: number } = {},
) {
  const where: Prisma.AuditLogWhereInput = {
    ...(options.entityType ? { entityType: options.entityType } : {}),
    ...(options.entityId ? { entityId: options.entityId } : {}),
  };
  const page = Math.max(1, options.page ?? 1);
  const [total, entries] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
  ]);
  return { entries, total, page, pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)) };
}
