"use server";

import { revalidateCatalog } from "@/features/catalog/cache";
import { formatCents } from "@/lib/money";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { getStripe } from "@/lib/stripe";
import { diffFields } from "../audit";
import { AdminActionError, adminMutation } from "../mutation";
import { sendShippedNotice } from "./notifications";
import { orderIdInputSchema, refundOrderSchema, shipOrderSchema } from "./schemas";
import { canTransition, refundableCents } from "./transitions";

/** PAID → FULFILLED ("packed"). */
export const markOrderPacked = adminMutation(orderIdInputSchema, async ({ tx, input, now }) => {
  const order = await tx.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw new AdminActionError("Order not found.");
  const check = canTransition(order.status, { to: "FULFILLED" });
  if (!check.ok) throw new AdminActionError(check.reason);

  const updated = await tx.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: "FULFILLED", fulfilledAt: now },
  });
  if (updated.count !== 1)
    throw new AdminActionError("The order changed meanwhile. Reload and try again.");

  return {
    result: { status: "FULFILLED" as const },
    audit: {
      action: "order.pack",
      entityType: "Order",
      entityId: order.id,
      summary: `Marked ${formatOrderNumber(order.number)} as packed`,
      changes: { status: [order.status, "FULFILLED"] },
    },
  };
});

/** PAID/FULFILLED → SHIPPED with tracking (or fix tracking on a shipped order); emails the customer. */
export const shipOrder = adminMutation(shipOrderSchema, async ({ tx, input, now }) => {
  const order = await tx.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw new AdminActionError("Order not found.");
  const check = canTransition(order.status, {
    to: "SHIPPED",
    carrier: input.carrier,
    trackingNumber: input.trackingNumber,
  });
  if (!check.ok) throw new AdminActionError(check.reason);

  const next = {
    status: "SHIPPED" as const,
    trackingCarrier: input.carrier,
    trackingNumber: input.trackingNumber,
    fulfilledAt: order.fulfilledAt ?? now,
    shippedAt: order.shippedAt ?? now,
  };
  const updated = await tx.order.updateMany({
    where: { id: order.id, status: order.status },
    data: next,
  });
  if (updated.count !== 1)
    throw new AdminActionError("The order changed meanwhile. Reload and try again.");

  const trackingChanged =
    order.trackingCarrier !== input.carrier || order.trackingNumber !== input.trackingNumber;
  return {
    result: { status: "SHIPPED" as const },
    audit: {
      action: order.status === "SHIPPED" ? "order.update_tracking" : "order.ship",
      entityType: "Order",
      entityId: order.id,
      summary:
        order.status === "SHIPPED"
          ? `Updated tracking for ${formatOrderNumber(order.number)}`
          : `Shipped ${formatOrderNumber(order.number)} via ${input.carrier}`,
      changes: diffFields(order, next, ["status", "trackingCarrier", "trackingNumber"]),
    },
    // Only email when there is something new to tell the customer.
    afterCommit: trackingChanged
      ? () => sendShippedNotice(order.id).then(() => undefined)
      : undefined,
  };
});

/**
 * Refunds part or all of an order through Stripe and optionally restocks lines.
 * Database writes happen first (inside the transaction) and the Stripe call
 * last: if Stripe fails, everything rolls back. If the commit failed after a
 * successful refund, the charge.refunded webhook still records it.
 */
export const refundOrder = adminMutation(refundOrderSchema, async ({ tx, input, admin, now }) => {
  const order = await tx.order.findUnique({
    where: { id: input.orderId },
    include: {
      items: { include: { variant: { select: { product: { select: { slug: true } } } } } },
    },
  });
  if (!order) throw new AdminActionError("Order not found.");
  if (!order.stripePaymentIntentId)
    throw new AdminActionError("This order has no Stripe payment to refund.");

  const refundable = refundableCents(order);
  if (refundable === 0) throw new AdminActionError("This order has nothing left to refund.");
  if (input.amountCents > refundable) {
    throw new AdminActionError(
      `You can refund at most ${formatCents(refundable, order.currency)}.`,
      {
        amountCents: `At most ${formatCents(refundable, order.currency)}.`,
      },
    );
  }

  const restockLines = input.restock.filter((line) => line.quantity > 0);
  const restockedSlugs = new Set<string>();
  for (const line of restockLines) {
    const item = order.items.find((candidate) => candidate.id === line.orderItemId);
    if (!item) throw new AdminActionError("A restock line doesn't belong to this order.");
    if (line.quantity > item.quantity - item.restockedQuantity) {
      throw new AdminActionError(
        `Can't restock more than ${item.quantity - item.restockedQuantity} of ${item.sku}.`,
      );
    }
    const marked = await tx.orderItem.updateMany({
      where: { id: item.id, restockedQuantity: item.restockedQuantity },
      data: { restockedQuantity: { increment: line.quantity } },
    });
    if (marked.count !== 1)
      throw new AdminActionError("The order changed meanwhile. Reload and try again.");
    if (item.variantId) {
      await tx.variant.update({
        where: { id: item.variantId },
        data: { stock: { increment: line.quantity } },
      });
      if (item.variant) restockedSlugs.add(item.variant.product.slug);
    }
  }

  const refundedCents = order.refundedCents + input.amountCents;
  const fullyRefunded = refundedCents >= order.totalCents;
  // Optimistic concurrency: a parallel refund changes refundedCents and makes this one fail.
  const updated = await tx.order.updateMany({
    where: { id: order.id, refundedCents: order.refundedCents },
    data: {
      refundedCents,
      ...(fullyRefunded ? { status: "REFUNDED" as const, refundedAt: now } : {}),
    },
  });
  if (updated.count !== 1)
    throw new AdminActionError("The order changed meanwhile. Reload and try again.");

  let refundId: string;
  try {
    const refund = await getStripe().refunds.create(
      {
        payment_intent: order.stripePaymentIntentId,
        amount: input.amountCents,
        reason: input.reason,
        metadata: { orderId: order.id, adminId: admin.id, note: input.note.slice(0, 200) },
      },
      { idempotencyKey: `admin-refund-${order.id}-${input.requestId}` },
    );
    refundId = refund.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AdminActionError(`Stripe refused the refund: ${message}`);
  }

  return {
    result: {
      refundId,
      refundedCents,
      status: fullyRefunded ? ("REFUNDED" as const) : order.status,
    },
    audit: {
      action: "order.refund",
      entityType: "Order",
      entityId: order.id,
      summary:
        `Refunded ${formatCents(input.amountCents, order.currency)} on ${formatOrderNumber(order.number)}` +
        (restockLines.length > 0
          ? `, restocked ${restockLines.reduce((sum, l) => sum + l.quantity, 0)} item(s)`
          : "") +
        (input.note ? ` (${input.note})` : ""),
      changes: {
        refundedCents: [order.refundedCents, refundedCents],
        ...(fullyRefunded ? { status: [order.status, "REFUNDED"] } : {}),
        stripeRefundId: [null, refundId],
      },
    },
    afterCommit:
      restockedSlugs.size > 0
        ? () => void revalidateCatalog({ productSlugs: [...restockedSlugs] })
        : undefined,
  };
});
