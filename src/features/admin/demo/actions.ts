"use server";

import { revalidatePath } from "next/cache";
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
  if (!inputSchema.safeParse(input).success) return { ok: false, error: "Invalid request." };
  if (!isDemoMode()) {
    return { ok: false, error: "Demo data can only be reset when the store runs in demo mode." };
  }

  const now = new Date();
  const wait = cooldownRemainingMs(await lastDemoResetAt(db), now);
  if (wait > 0) {
    return {
      ok: false,
      error: `The demo was reset moments ago. Try again in ${Math.ceil(wait / 1000)} seconds.`,
    };
  }

  try {
    const { touchedSlugs, ...summary } = await resetDemoData(db, {
      actor: { id: admin.id, email: admin.email },
      now,
    });
    revalidateCatalog({ productSlugs: touchedSlugs, categories: true });
    revalidatePath("/admin", "layout");
    return { ok: true, data: summary };
  } catch (error) {
    console.error("[admin] demo reset failed", error);
    return {
      ok: false,
      error: "The reset stopped part-way. Run it again to finish restoring the demo.",
    };
  }
}
