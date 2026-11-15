import { sentEmails, signInAs, useFakeStripe } from "@/test/admin";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser, createVariant, getVariantStock, resetDatabase, testDb } from "@/test/db";
import type { FakeStripe } from "@/test/fake-stripe";
import { markOrderPacked, refundOrder, shipOrder } from "./actions";

let stripe: FakeStripe;

async function paidOrder(options: { quantity?: number; unitPriceCents?: number } = {}) {
  const quantity = options.quantity ?? 2;
  const unit = options.unitPriceCents ?? 2000;
  const variant = await createVariant({ stock: 5, priceCents: unit });
  const order = await testDb.order.create({
    data: {
      status: "PAID",
      email: "buyer@example.com",
      subtotalCents: unit * quantity,
      totalCents: unit * quantity,
      paidAt: new Date(),
      stripePaymentIntentId: "pi_test_order",
      items: {
        create: [
          {
            variantId: variant.id,
            productName: "Mug",
            variantTitle: "12 oz",
            sku: variant.sku,
            unitPriceCents: unit,
            quantity,
            lineTotalCents: unit * quantity,
          },
        ],
      },
    },
    include: { items: true },
  });
  return { order, variant, item: order.items[0]! };
}

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeEach(async () => {
  await resetDatabase();
  stripe = useFakeStripe();
  sentEmails.mockClear();
  const admin = await createUser({ email: "admin@example.com" });
  await testDb.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  signInAs({ id: admin.id, email: admin.email, role: "ADMIN" });
});

describe("status changes", () => {
  it("packs, then ships with tracking and emails the customer once", async () => {
    const { order } = await paidOrder();

    expect(await markOrderPacked({ orderId: order.id })).toEqual({
      ok: true,
      data: { status: "FULFILLED" },
    });
    expect(
      await shipOrder({ orderId: order.id, carrier: "UPS", trackingNumber: "1Z999AA1" }),
    ).toMatchObject({ ok: true });

    const shipped = await testDb.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(shipped).toMatchObject({
      status: "SHIPPED",
      trackingCarrier: "UPS",
      trackingNumber: "1Z999AA1",
      fulfilledAt: expect.any(Date),
      shippedAt: expect.any(Date),
      shippingEmailSentAt: expect.any(Date),
    });
    expect(sentEmails).toHaveBeenCalledTimes(1);
    expect(sentEmails).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        idempotencyKey: `order-shipped/${order.id}/1Z999AA1`,
      }),
    );

    // Re-submitting the same tracking changes nothing for the customer.
    await shipOrder({ orderId: order.id, carrier: "UPS", trackingNumber: "1Z999AA1" });
    expect(sentEmails).toHaveBeenCalledTimes(1);

    // A corrected number is a new email.
    await shipOrder({ orderId: order.id, carrier: "UPS", trackingNumber: "1Z999AA2" });
    expect(sentEmails).toHaveBeenCalledTimes(2);

    const actions = (await testDb.auditLog.findMany({ orderBy: { createdAt: "asc" } })).map(
      (a) => a.action,
    );
    expect(actions).toEqual([
      "order.pack",
      "order.ship",
      "order.update_tracking",
      "order.update_tracking",
    ]);
  });

  it("rejects transitions the state machine doesn't allow, with no audit row", async () => {
    const { order } = await paidOrder();
    await testDb.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });

    expect(await markOrderPacked({ orderId: order.id })).toMatchObject({ ok: false });
    expect(
      await shipOrder({ orderId: order.id, carrier: "USPS", trackingNumber: "9400100" }),
    ).toMatchObject({ ok: false });
    expect(await testDb.auditLog.count()).toBe(0);
    expect(sentEmails).not.toHaveBeenCalled();
  });
});

describe("refunds", () => {
  it("refunds part, restocks, then refunds the rest and marks the order refunded", async () => {
    const { order, variant, item } = await paidOrder({ quantity: 2, unitPriceCents: 2000 });

    const partial = await refundOrder({
      orderId: order.id,
      requestId: uuid(1),
      amountCents: 1500,
      reason: "requested_by_customer",
      note: "Chipped mug",
      restock: [{ orderItemId: item.id, quantity: 1 }],
    });
    expect(partial).toMatchObject({ ok: true, data: { refundedCents: 1500, status: "PAID" } });
    expect(stripe.refunds.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ payment_intent: "pi_test_order", amount: 1500 }),
      { idempotencyKey: `admin-refund-${order.id}-${uuid(1)}` },
    );
    expect(await getVariantStock(variant.id)).toBe(6);
    expect(
      (await testDb.orderItem.findUniqueOrThrow({ where: { id: item.id } })).restockedQuantity,
    ).toBe(1);

    const rest = await refundOrder({
      orderId: order.id,
      requestId: uuid(2),
      amountCents: 2500,
      reason: "requested_by_customer",
      restock: [],
    });
    expect(rest).toMatchObject({ ok: true, data: { refundedCents: 4000, status: "REFUNDED" } });
    expect(await testDb.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
      status: "REFUNDED",
      refundedCents: 4000,
      refundedAt: expect.any(Date),
    });

    const audits = await testDb.auditLog.findMany({
      where: { action: "order.refund" },
      orderBy: { createdAt: "asc" },
    });
    expect(audits).toHaveLength(2);
    expect(audits[0]?.summary).toContain("restocked 1 item");
  });

  it("refuses more than the refundable amount or more restock than was sold", async () => {
    const { order, item, variant } = await paidOrder({ quantity: 1, unitPriceCents: 2000 });

    expect(
      await refundOrder({
        orderId: order.id,
        requestId: uuid(3),
        amountCents: 2001,
        reason: "duplicate",
        restock: [],
      }),
    ).toMatchObject({ ok: false, fieldErrors: { amountCents: expect.any(String) } });
    expect(
      await refundOrder({
        orderId: order.id,
        requestId: uuid(4),
        amountCents: 100,
        reason: "duplicate",
        restock: [{ orderItemId: item.id, quantity: 2 }],
      }),
    ).toMatchObject({ ok: false });

    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(await getVariantStock(variant.id)).toBe(5);
    expect(await testDb.auditLog.count()).toBe(0);
  });

  it("changes nothing when Stripe refuses the refund", async () => {
    const { order, item, variant } = await paidOrder();
    stripe.refunds.create.mockRejectedValueOnce(new Error("Charge already refunded"));

    const result = await refundOrder({
      orderId: order.id,
      requestId: uuid(5),
      amountCents: 1000,
      reason: "requested_by_customer",
      restock: [{ orderItemId: item.id, quantity: 1 }],
    });

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("Charge already refunded"),
    });
    expect(await testDb.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
      refundedCents: 0,
      status: "PAID",
    });
    expect(await getVariantStock(variant.id)).toBe(5);
    expect(
      (await testDb.orderItem.findUniqueOrThrow({ where: { id: item.id } })).restockedQuantity,
    ).toBe(0);
    expect(await testDb.auditLog.count()).toBe(0);
  });
});
