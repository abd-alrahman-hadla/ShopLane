"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { revalidateCatalog } from "@/features/catalog/cache";
import {
  cooldownRemainingMs,
  lastDemoResetAt,
  resetDemoData,
  type DemoResetSummary,
} from "@/features/demo/reset";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { getAdminUser } from "../guard";
import { FORBIDDEN, type AdminResult } from "../mutation";

const inputSchema = z.object({}).strict();

/**
 * "Reset demo data" (demo mode only). Not built with adminMutation: a full
 * re-seed is hundreds of writes, too many for one interactive transaction over
 * a slow link. It keeps the same order of checks (admin first, then input), and
 * the audit row is written atomically with the visitor-data cleanup (see reset.ts).
 */
export async function resetDemoDataAction(input: unknown): Promise<AdminResult<DemoResetSummary>> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: FORBIDDEN };
  const t = await getTranslations("admin.errors");
  if (!inputSchema.safeParse(input).success) return { ok: false, error: t("invalidRequest") };
  if (!isDemoMode()) return { ok: false, error: t("demoOnly") };

  const now = new Date();
  const wait = cooldownRemainingMs(await lastDemoResetAt(db), now);
  if (wait > 0) {
    return { ok: false, error: t("demoCooldown", { seconds: Math.ceil(wait / 1000) }) };
  }

  try {
    const { touchedSlugs, ...summary } = await resetDemoData(db, {
      actor: { id: admin.id, email: admin.email },
      now,
    });
    revalidateCatalog({ productSlugs: touchedSlugs, categories: true });
    revalidatePath("/[locale]/admin", "layout");
    return { ok: true, data: summary };
  } catch (error) {
    console.error("[admin] demo reset failed", error);
    return { ok: false, error: t("demoPartial") };
  }
}
