import { getLocale, getTranslations } from "next-intl/server";
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

/** Translates an `admin.errors` message in the admin's language. */
export type AdminTranslate = (key: string, values?: Record<string, string | number>) => string;

export type HandlerContext<I> = {
  tx: DbClient;
  admin: SessionUser;
  input: I;
  now: Date;
  t: AdminTranslate;
};

export type HandlerOutput<T> = {
  result: T;
  /** Written in the same transaction: a change cannot commit without its audit row. */
  audit: AuditEntry | AuditEntry[];
  /** Runs after commit (cache revalidation, emails). Failures are logged, not thrown. */
  afterCommit?: () => Promise<void> | void;
};

export const FORBIDDEN = "forbidden";

/**
 * One message per field. The schemas' own messages are English; in other
 * languages each field gets a translated message for its kind of problem.
 */
function firstFieldErrors(
  error: z.ZodError,
  locale: string,
  t: AdminTranslate,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (result[key]) continue;
    if (locale === "en") result[key] = issue.message;
    else if (issue.code === "too_small") result[key] = t("field.tooSmall");
    else if (issue.code === "too_big") result[key] = t("field.tooBig");
    else result[key] = t("field.invalid");
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

    const [locale, translator] = await Promise.all([getLocale(), getTranslations("admin.errors")]);
    const t = translator as unknown as AdminTranslate;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: t("fixFields"),
        fieldErrors: firstFieldErrors(parsed.error, locale, t),
      };
    }

    let output: HandlerOutput<T>;
    try {
      output = await db.$transaction(
        async (tx) => {
          const out = await handler({ tx, admin, input: parsed.data, now: new Date(), t });
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
      return { ok: false, error: t("generic") };
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
