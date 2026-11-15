import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailSender } from "@/lib/email";
import { createCoupon, createVariant, getVariantStock, resetDatabase, testDb } from "@/test/db";
import { asStripeGateway, createFakeStripe, type FakeStripe } from "@/test/fake-stripe";
import { createPendingTestOrder } from "@/test/orders";
import { checkoutSessionCompletedEvent } from "./__fixtures__/stripe-events";
import { processStripeEvent, type WebhookDeps } from "./webhook";

let stripe: FakeStripe;
let sendEmail: ReturnType<typeof vi.fn<EmailSender>>;

function deps(): WebhookDeps {
  return {
    db: testDb,
    stripe: asStripeGateway(stripe),
    sendEmail,
    siteUrl: "http://localhost:3000",
    now: () => new Date(),
  };
}

beforeEach(async () => {
  await resetDatabase();
  stripe = createFakeStripe();
  sendEmail = vi.fn<EmailSender>(async () => ({ id: "email_test" }));
});

describe("stock races", () => {
  it("two buyers, one item left: exactly one is paid and the other refunded", async () => {
    const variant = await createVariant({ stock: 1, priceCents: 2400 });
    const coupon = await createCoupon({ code: "RACE", maxRedemptions: 10 });
    // Both shoppers passed the stock check when they started checkout.
    const buyerA = await createPendingTestOrder({
      items: [{ variantId: variant.id, quantity: 1 }],
      couponCode: "RACE",
    });
    const buyerB = await createPendingTestOrder({
      items: [{ variantId: variant.id, quantity: 1 }],
      couponCode: "RACE",
    });

    const results = await Promise.all([
      processStripeEvent(
        checkoutSessionCompletedEvent({ orderId: buyerA.id, paymentIntentId: "pi_buyer_a" }),
        deps(),
      ),
      processStripeEvent(
        checkoutSessionCompletedEvent({ orderId: buyerB.id, paymentIntentId: "pi_buyer_b" }),
        deps(),
      ),
    ]);

    expect(results.map((r) => r.outcome).sort()).toEqual(["out_of_stock_refunded", "paid"]);
    expect(await getVariantStock(variant.id)).toBe(0);

    const orders = await testDb.order.findMany({ orderBy: { number: "asc" } });
    const paid = orders.filter((o) => o.status === "PAID");
    const cancelled = orders.filter((o) => o.status === "CANCELLED");
    expect(paid).toHaveLength(1);
    expect(cancelled).toHaveLength(1);
    expect(cancelled[0]?.cancelReason).toBe("out_of_stock");

    // Exactly one refund, for the loser's payment.
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: cancelled[0]?.stripePaymentIntentId }),
      { idempotencyKey: `oos-refund-${cancelled[0]?.id}` },
    );
    // The loser's coupon redemption is released.
    expect(
      (await testDb.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).redemptionCount,
    ).toBe(1);
    // Winner gets a confirmation, loser an apology.
    expect(sendEmail.mock.calls.map(([message]) => message.idempotencyKey).sort()).toEqual(
      [`order-confirmation/${paid[0]?.id}`, `order-out-of-stock/${cancelled[0]?.id}`].sort(),
    );
  });

  it("ten buyers, three units: exactly three are paid and stock never goes negative", async () => {
    const variant = await createVariant({ stock: 3 });
    const orders = [];
    for (let i = 0; i < 10; i += 1) {
      orders.push(
        await createPendingTestOrder({ items: [{ variantId: variant.id, quantity: 1 }] }),
      );
    }

    const results = await Promise.all(
      orders.map((order) =>
        processStripeEvent(checkoutSessionCompletedEvent({ orderId: order.id }), deps()),
      ),
    );

    expect(results.filter((r) => r.outcome === "paid")).toHaveLength(3);
    expect(results.filter((r) => r.outcome === "out_of_stock_refunded")).toHaveLength(7);
    expect(await getVariantStock(variant.id)).toBe(0);
    expect(stripe.refunds.create).toHaveBeenCalledTimes(7);
  });

  it("an order with several lines takes all of its stock or none of it", async () => {
    const plenty = await createVariant({ stock: 5 });
    const scarce = await createVariant({ stock: 1 });
    const first = await createPendingTestOrder({ items: [{ variantId: scarce.id, quantity: 1 }] });
    const second = await createPendingTestOrder({
      items: [
        { variantId: plenty.id, quantity: 2 },
        { variantId: scarce.id, quantity: 1 },
      ],
    });

    await processStripeEvent(checkoutSessionCompletedEvent({ orderId: first.id }), deps());
    const result = await processStripeEvent(
      checkoutSessionCompletedEvent({ orderId: second.id }),
      deps(),
    );

    expect(result.outcome).toBe("out_of_stock_refunded");
    // The plentiful line was put back.
    expect(await getVariantStock(plenty.id)).toBe(5);
    expect(await getVariantStock(scarce.id)).toBe(0);
  });
});
