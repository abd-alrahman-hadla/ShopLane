"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dedupeItems, type CartItem } from "./cart";
import { buildCartQuote, type CartQuote } from "./quote";
import { cartItemsSchema, cartQuoteInputSchema } from "./schemas";
import { mergeGuestCart, saveServerCart } from "./server-cart";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Prices the browser's cart from the database. */
export async function getCartQuote(input: unknown): Promise<ActionResult<CartQuote>> {
  const parsed = cartQuoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid cart." };
  const quote = await buildCartQuote(db, {
    items: parsed.data.items,
    couponCode: parsed.data.couponCode,
    now: new Date(),
  });
  return { ok: true, data: quote };
}

/** Merges the guest cart into the signed-in user's server cart (on sign-in). */
export async function mergeCartOnSignIn(input: unknown): Promise<ActionResult<CartItem[]>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const parsed = cartItemsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid cart." };
  const userId = session.user.id;
  const merged = await db.$transaction((tx) =>
    mergeGuestCart(tx, userId, dedupeItems(parsed.data)),
  );
  return { ok: true, data: merged };
}

/** Saves the browser's cart as the signed-in user's server cart. */
export async function syncServerCart(input: unknown): Promise<ActionResult<null>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const parsed = cartItemsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid cart." };
  const userId = session.user.id;
  await db.$transaction((tx) => saveServerCart(tx, userId, dedupeItems(parsed.data)));
  return { ok: true, data: null };
}
