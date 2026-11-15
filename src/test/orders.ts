/** Creates orders directly, as beginCheckout (and the webhook) would, for tests. */
import type { OrderStatus } from "@/generated/prisma/client";
import { createPendingOrder } from "@/features/checkout/orders";
import { testDb } from "./db";

/** An order in a given state, owned by a user and/or placed with an email (guest). */
export async function createTestOrder(options: {
  items: Array<{ variantId: string; quantity: number }>;
  status: OrderStatus;
  userId?: string | null;
  email?: string | null;
  cancelReason?: string | null;
}) {
  const pending = await createPendingTestOrder({ items: options.items });
  return testDb.order.update({
    where: { id: pending.id },
    data: {
      status: options.status,
      userId: options.userId ?? null,
      email: options.email ?? null,
      cancelReason: options.cancelReason ?? null,
      paidAt: options.status === "PENDING" ? null : new Date(),
    },
  });
}

export async function createPendingTestOrder(options: {
  items: Array<{ variantId: string; quantity: number }>;
  couponCode?: string;
  sessionId?: string;
}) {
  const result = await testDb.$transaction((tx) =>
    createPendingOrder(tx, {
      items: options.items,
      couponCode: options.couponCode,
      now: new Date(),
    }),
  );
  if (!result.ok) throw new Error(`Could not create test order: ${result.error}`);
  return testDb.order.update({
    where: { id: result.orderId },
    data: { stripeCheckoutSessionId: options.sessionId ?? `cs_test_${result.orderId}` },
  });
}
