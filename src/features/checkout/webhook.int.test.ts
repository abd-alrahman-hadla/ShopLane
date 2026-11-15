import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailSender } from "@/lib/email";
import { createCoupon, createVariant, getVariantStock, resetDatabase, testDb } from "@/test/db";
import { asStripeGateway, createFakeStripe, type FakeStripe } from "@/test/fake-stripe";
import { createPendingTestOrder } from "@/test/orders";
import {
  chargeRefundedEvent,
  checkoutSessionCompletedEvent,
  checkoutSessionExpiredEvent,
} from "./__fixtures__/stripe-events";
import { processStripeEvent, type WebhookDeps } from "./webhook";

let stripe: FakeStripe;
let sendEmail: ReturnType<typeof vi.fn<EmailSender>>;
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function deps(): WebhookDeps {
  return {
    db: testDb,
    stripe: asStripeGateway(stripe),
    sendEmail,
    siteUrl: "http://localhost:3000",
    now: () => new Date(),
    logger,
  };
}

beforeEach(async () => {
  await resetDatabase();
  stripe = createFakeStripe();
  sendEmail = vi.fn<EmailSender>(async () => ({ id: "email_test" }));
});

describe("checkout.session.completed", () => {
  it("marks the order paid, takes stock, stores payment details and emails once", async () => {
    const variant = await createVariant({ stock: 5, priceCents: 2100 });
    const order = await createPendingTestOrder({ items: [{ variantId: variant.id, quantity: 2 }] });
    const event = checkoutSessionCompletedEvent({
      orderId: order.id,
      paymentIntentId: "pi_paid_1",
      amountTotal: order.totalCents,
      email: "jamie@example.com",
    });

    const result = await processStripeEvent(event, deps());

    expect(result).toEqual({ outcome: "paid", orderId: order.id });
    const paid = await testDb.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid).toMatchObject({
      status: "PAID",
      email: "jamie@example.com",
      stripePaymentIntentId: "pi_paid_1",
      paidAt: expect.any(Date),
      confirmationEmailSentAt: expect.any(Date),
      shippingAddress: expect.objectContaining({ city: "Portland", postalCode: "97205" }),
    });
    expect(await getVariantStock(variant.id)).toBe(3);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jamie@example.com",
        idempotencyKey: `order-confirmation/${order.id}`,
      }),
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("processes the same event id only once", async () => {
    const variant = await createVariant({ stock: 5 });
    const order = await createPendingTestOrder({ items: [{ variantId: variant.id, quantity: 1 }] });
    const event = checkoutSessionCompletedEvent({
      orderId: order.id,
      amountTotal: order.totalCents,
    });

    const first = await processStripeEvent(event, deps());
    const second = await processStripeEvent(event, deps());

    expect(first.outcome).toBe("paid");
    expect(second).toEqual({ outcome: "duplicate" });
    expect(await getVariantStock(variant.id)).toBe(4);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(await testDb.stripeEvent.count()).toBe(1);
  });

  it("handles concurrent duplicate deliveries once", async () => {
    const variant = await createVariant({ stock: 5 });
    const order = await createPendingTestOrder({ items: [{ variantId: variant.id, quantity: 1 }] });
    const event = checkoutSessionCompletedEvent({
      orderId: order.id,
      amountTotal: order.totalCents,
    });

    const outcomes = await Promise.all([
      processStripeEvent(event, deps()),
      processStripeEvent(event, deps()),
    ]);

    expect(outcomes.map((o) => o.outcome).sort()).toEqual(["duplicate", "paid"]);
    expect(await getVariantStock(variant.id)).toBe(4);
  });

  it("ignores sessions that are not paid yet", async () => {
    const variant = await createVariant({ stock: 5 });
    const order = await createPendingTestOrder({ items: [{ variantId: variant.id, quantity: 1 }] });
    const event = checkoutSessionCompletedEvent({ orderId: order.id, paymentStatus: "unpaid" });

    expect(await processStripeEvent(event, deps())).toMatchObject({ outcome: "ignored" });
    expect((await testDb.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      "PENDING",
    );
    expect(await getVariantStock(variant.id)).toBe(5);
  });

  it("ignores events for unknown orders (e.g. `stripe trigger`)", async () => {
    const event = checkoutSessionCompletedEvent({ orderId: "not-an-order" });
    expect(await processStripeEvent(event, deps())).toEqual({
      outcome: "ignored",
      detail: "no matching order",
    });
  });

  it("logs when Stripe's total differs from the order total", async () => {
    const variant = await createVariant({ stock: 5 });
    const order = await createPendingTestOrder({ items: [{ variantId: variant.id, quantity: 1 }] });
    await processStripeEvent(
      checkoutSessionCompletedEvent({ orderId: order.id, amountTotal: order.totalCents + 1 }),
      deps(),
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Stripe charged"));
  });

  it("rolls back and lets Stripe retry when processing fails", async () => {
    const variant = await createVariant({ stock: 1 });
    const winner = await createPendingTestOrder({
      items: [{ variantId: variant.id, quantity: 1 }],
    });
    const loser = await createPendingTestOrder({ items: [{ variantId: variant.id, quantity: 1 }] });
    await processStripeEvent(checkoutSessionCompletedEvent({ orderId: winner.id }), deps());

    stripe.refunds.create.mockRejectedValueOnce(new Error("Stripe unavailable"));
    const event = checkoutSessionCompletedEvent({ orderId: loser.id, paymentIntentId: "pi_retry" });
    await expect(processStripeEvent(event, deps())).rejects.toThrow("Stripe unavailable");
    expect(await testDb.stripeEvent.findUnique({ where: { id: event.id } })).toBeNull();
    expect((await testDb.order.findUniqueOrThrow({ where: { id: loser.id } })).status).toBe(
      "PENDING",
    );

    // Stripe's retry succeeds; the refund is idempotent by order.
    expect((await processStripeEvent(event, deps())).outcome).toBe("out_of_stock_refunded");
    expect(stripe.refunds.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ payment_intent: "pi_retry" }),
      { idempotencyKey: `oos-refund-${loser.id}` },
    );
  });

  it("does not fail the webhook when the confirmation email fails", async () => {
    const variant = await createVariant({ stock: 5 });
    const order = await createPendingTestOrder({ items: [{ variantId: variant.id, quantity: 1 }] });
    sendEmail.mockRejectedValueOnce(new Error("Resend down"));

    const result = await processStripeEvent(
      checkoutSessionCompletedEvent({ orderId: order.id }),
      deps(),
    );

    expect(result.outcome).toBe("paid");
    const paid = await testDb.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid.status).toBe("PAID");
    expect(paid.confirmationEmailSentAt).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("checkout.session.expired", () => {
  it("cancels the pending order and releases its coupon", async () => {
    const variant = await createVariant({ stock: 5 });
    const coupon = await createCoupon({ code: "ONCE", maxRedemptions: 1 });
    const order = await createPendingTestOrder({
      items: [{ variantId: variant.id, quantity: 1 }],
      couponCode: "ONCE",
    });
    expect(
      (await testDb.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).redemptionCount,
    ).toBe(1);

    const result = await processStripeEvent(
      checkoutSessionExpiredEvent({ orderId: order.id }),
      deps(),
    );

    expect(result).toEqual({ outcome: "cancelled", orderId: order.id });
    expect(await testDb.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
      status: "CANCELLED",
      cancelReason: "checkout_expired",
      cancelledAt: expect.any(Date),
    });
    expect(
      (await testDb.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).redemptionCount,
    ).toBe(0);
    expect(await getVariantStock(variant.id)).toBe(5);
  });

  it("leaves paid orders alone", async () => {
    const variant = await createVariant({ stock: 5 });
    const order = await createPendingTestOrder({ items: [{ variantId: variant.id, quantity: 1 }] });
    await processStripeEvent(checkoutSessionCompletedEvent({ orderId: order.id }), deps());

    const result = await processStripeEvent(
      checkoutSessionExpiredEvent({ orderId: order.id }),
      deps(),
    );

    expect(result.outcome).toBe("ignored");
    expect((await testDb.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
  });
});

describe("charge.refunded", () => {
  async function paidOrder() {
    const variant = await createVariant({ stock: 5 });
    const order = await createPendingTestOrder({ items: [{ variantId: variant.id, quantity: 1 }] });
    await processStripeEvent(
      checkoutSessionCompletedEvent({ orderId: order.id, paymentIntentId: `pi_${order.id}` }),
      deps(),
    );
    return { order, variant, paymentIntentId: `pi_${order.id}` };
  }

  it("marks a fully refunded order REFUNDED without restocking", async () => {
    const { order, variant, paymentIntentId } = await paidOrder();

    const result = await processStripeEvent(
      chargeRefundedEvent({ paymentIntentId, amount: order.totalCents }),
      deps(),
    );

    expect(result).toEqual({ outcome: "refunded", orderId: order.id });
    expect(await testDb.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
      status: "REFUNDED",
      refundedAt: expect.any(Date),
    });
    expect(await getVariantStock(variant.id)).toBe(4);
  });

  it("records a partial refund without changing the status", async () => {
    const { order, paymentIntentId } = await paidOrder();

    const result = await processStripeEvent(
      chargeRefundedEvent({ paymentIntentId, amount: order.totalCents, amountRefunded: 500 }),
      deps(),
    );

    expect(result).toEqual({ outcome: "partially_refunded", orderId: order.id });
    expect(await testDb.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
      status: "PAID",
      refundedCents: 500,
    });
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("partial refund"));

    // A later event with the same running total changes nothing.
    const again = await processStripeEvent(
      chargeRefundedEvent({ paymentIntentId, amount: order.totalCents, amountRefunded: 500 }),
      deps(),
    );
    expect(again).toMatchObject({ outcome: "ignored", detail: "partial refund already recorded" });
  });

  it("records the full amount when the refund completes", async () => {
    const { order, paymentIntentId } = await paidOrder();
    await processStripeEvent(
      chargeRefundedEvent({ paymentIntentId, amount: order.totalCents }),
      deps(),
    );
    expect(await testDb.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
      status: "REFUNDED",
      refundedCents: order.totalCents,
    });
  });

  it("is idempotent across different refund events", async () => {
    const { order, paymentIntentId } = await paidOrder();
    await processStripeEvent(
      chargeRefundedEvent({ paymentIntentId, amount: order.totalCents }),
      deps(),
    );
    const again = await processStripeEvent(
      chargeRefundedEvent({ paymentIntentId, amount: order.totalCents }),
      deps(),
    );
    expect(again).toMatchObject({ outcome: "ignored", detail: "already refunded" });
  });

  it("ignores charges that belong to no order", async () => {
    const result = await processStripeEvent(
      chargeRefundedEvent({ paymentIntentId: "pi_unknown", amount: 1000 }),
      deps(),
    );
    expect(result).toEqual({ outcome: "ignored", detail: "no matching order" });
  });
});

describe("unhandled events", () => {
  it("records and ignores event types we do not handle", async () => {
    const event = {
      ...checkoutSessionExpiredEvent({ orderId: "x" }),
      type: "customer.created",
    } as Stripe.Event;
    const result = await processStripeEvent(event, deps());
    expect(result).toEqual({ outcome: "ignored", detail: "unhandled event type customer.created" });
    expect(await testDb.stripeEvent.count()).toBe(1);
  });
});
