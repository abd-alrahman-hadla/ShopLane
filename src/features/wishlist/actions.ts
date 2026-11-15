"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { getWishlistProductIds, setWishlisted } from "./wishlist";

const inputSchema = z
  .object({ productId: z.string().min(1).max(40), wishlisted: z.boolean() })
  .strict();

export type WishlistActionResult =
  | { ok: true; wishlisted: boolean }
  | { ok: false; error: "unauthenticated" | "invalid" | "product_not_found" | "wishlist_full" };

export async function setWishlistedAction(input: unknown): Promise<WishlistActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const result = await setWishlisted(db, user.id, parsed.data.productId, parsed.data.wishlisted);
  // Refreshes the wishlist page when the change was made there (no effect elsewhere).
  if (result.ok) revalidatePath("/account/wishlist");
  return result;
}

/** The signed-in user's wishlisted product IDs (empty when signed out). */
export async function getMyWishlistIds(): Promise<string[]> {
  const user = await getSessionUser();
  if (!user) return [];
  return getWishlistProductIds(db, user.id);
}
