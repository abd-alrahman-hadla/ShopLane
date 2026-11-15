import type { z } from "zod";
import type { DbClient } from "@/features/cart/quote";
import type { SessionUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { writeAudit, type AuditEntry } from "./audit";
import { getAdminUser } from "./guard";

export type AdminResult<T> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Thrown inside a handler to abort the transaction with a user-facing message. */
export class AdminActionError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AdminActionError";
  }
}

export type HandlerContext<I> = { tx: DbClient; admin: SessionUser; input: I; now: Date };

export type HandlerOutput<T> = {
  result: T;
  /** Written in the same transaction: a change cannot commit without its audit row. */
  audit: AuditEntry | AuditEntry[];
  /** Runs after commit (cache revalidation, emails). Failures are logged, not thrown. */
  afterCommit?: () => Promise<void> | void;
};

export const FORBIDDEN = "forbidden";

function firstFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    result[key] ??= issue.message;
  }
  return result;
}

/**
 * Builds an admin Server Action. Order matters and is the same for every action:
 * 1. admin check (before looking at the input), 2. strict input validation,
 * 3. handler + audit rows in one transaction, 4. post-commit effects.
 */
export function adminMutation<S extends z.ZodType, T>(
  schema: S,
  handler: (ctx: HandlerContext<z.infer<S>>) => Promise<HandlerOutput<T>>,
): (input: unknown) => Promise<AdminResult<T>> {
  return async (raw: unknown): Promise<AdminResult<T>> => {
    const admin = await getAdminUser();
    if (!admin) return { ok: false, error: FORBIDDEN };

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: firstFieldErrors(parsed.error),
      };
    }

    let output: HandlerOutput<T>;
    try {
      output = await db.$transaction(
        async (tx) => {
          const out = await handler({ tx, admin, input: parsed.data, now: new Date() });
          const entries = Array.isArray(out.audit) ? out.audit : [out.audit];
          if (entries.length === 0)
            throw new Error("Admin mutations must write at least one audit entry");
          for (const entry of entries)
            await writeAudit(tx, { id: admin.id, email: admin.email }, entry);
          return out;
        },
        { timeout: 30_000, maxWait: 10_000 },
      );
    } catch (error) {
      if (error instanceof AdminActionError) {
        return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
      }
      console.error("[admin] mutation failed", error);
      return { ok: false, error: "Something went wrong. Nothing was changed." };
    }

    if (output.afterCommit) {
      try {
        await output.afterCommit();
      } catch (error) {
        console.error("[admin] post-commit effect failed", error);
      }
    }
    return { ok: true, data: output.result };
  };
}
