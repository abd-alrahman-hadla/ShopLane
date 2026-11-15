"use server";

import { redirect } from "next/navigation";
import { cartQuoteInputSchema } from "@/features/cart/schemas";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { beginCheckout } from "./checkout";
import type { CartProblem } from "./orders";

export type StartCheckoutError =
  | { error: "invalid_cart" | "empty_cart" | "payment_unavailable"; message: string }
  | { error: "cart_changed"; message: string; problems: CartProblem[] }
  | { error: "coupon_rejected"; message: string };

const MESSAGES = {
  invalid_cart: "Your cart couldn’t be read. Please refresh and try again.",
  empty_cart: "Your cart is empty.",
  cart_changed: "Some items changed price or availability. Please review your cart.",
  payment_unavailable: "Payment is unavailable right now. Please try again in a moment.",
} as const;

/**
 * Starts checkout and redirects to Stripe. Accepts only variant IDs,
 * quantities and a coupon code; every price is read from the database.
 */
export async function startCheckout(input: unknown): Promise<StartCheckoutError> {
  const parsed = cartQuoteInputSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_cart", message: MESSAGES.invalid_cart };

  const session = await auth();
  const result = await beginCheckout(
    { db, stripe: getStripe(), siteUrl: env.NEXT_PUBLIC_SITE_URL, now: () => new Date() },
    {
      items: parsed.data.items,
      couponCode: parsed.data.couponCode,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    },
  );

  if (result.ok) redirect(result.url);
  switch (result.error) {
    case "cart_changed":
      return { error: result.error, message: MESSAGES.cart_changed, problems: result.problems };
    case "coupon_rejected":
      return { error: result.error, message: result.message };
    default:
      return { error: result.error, message: MESSAGES[result.error] };
  }
}
