import type { PrismaClient } from "@/generated/prisma/client";
import type { CartItem } from "@/features/cart/cart";
import type { StripeGateway } from "@/lib/stripe";
import { cancelPendingOrder, createPendingOrder, type CartProblem } from "./orders";
import { buildCheckoutSessionParams, buildOrderCouponParams } from "./stripe-session";

export type CheckoutDeps = {
  db: PrismaClient;
  stripe: Pick<StripeGateway, "checkout" | "coupons">;
  siteUrl: string;
  now: () => Date;
};

export type BeginCheckoutInput = {
  items: readonly CartItem[];
  couponCode?: string | null;
  userId?: string | null;
  email?: string | null;
};

export type BeginCheckoutResult =
  | { ok: true; orderId: string; url: string }
  | { ok: false; error: "empty_cart" | "payment_unavailable" }
  | { ok: false; error: "cart_changed"; problems: CartProblem[] }
  | { ok: false; error: "coupon_rejected"; message: string };

/**
 * Creates the PENDING order (prices from the DB), then a Stripe Checkout
 * Session for exactly that snapshot. If Stripe fails, the order is cancelled
 * and its coupon redemption released.
 */
export async function beginCheckout(
  deps: CheckoutDeps,
  input: BeginCheckoutInput,
): Promise<BeginCheckoutResult> {
  const now = deps.now();
  const created = await deps.db.$transaction((tx) => createPendingOrder(tx, { ...input, now }), {
    timeout: 15_000,
  });
  if (!created.ok) return created;

  const order = await deps.db.order.findUniqueOrThrow({
    where: { id: created.orderId },
    include: { items: { orderBy: { id: "asc" } } },
  });

  try {
    const stripeCoupon =
      order.discountCents > 0
        ? await deps.stripe.coupons.create(buildOrderCouponParams(order), {
            idempotencyKey: `order-coupon-${order.id}`,
          })
        : null;
    const session = await deps.stripe.checkout.sessions.create(
      buildCheckoutSessionParams(order, {
        siteUrl: deps.siteUrl,
        now,
        stripeCouponId: stripeCoupon?.id,
      }),
      { idempotencyKey: `checkout-${order.id}` },
    );
    if (!session.url) throw new Error("Stripe returned a session without a URL");

    await deps.db.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id, expiresAt: new Date(session.expires_at * 1000) },
    });
    return { ok: true, orderId: order.id, url: session.url };
  } catch (error) {
    console.error(`[checkout] Stripe session for order ${order.id} failed`, error);
    await deps.db.$transaction((tx) =>
      cancelPendingOrder(tx, order.id, "payment_failed", deps.now()),
    );
    return { ok: false, error: "payment_unavailable" };
  }
}
