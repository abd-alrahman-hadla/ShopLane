/** Creates PENDING orders directly, as beginCheckout would, for webhook tests. */
import { createPendingOrder } from "@/features/checkout/orders";
import { testDb } from "./db";

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
