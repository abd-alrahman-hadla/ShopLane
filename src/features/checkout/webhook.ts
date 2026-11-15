import type Stripe from "stripe";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { DbClient } from "@/features/cart/quote";
import type { EmailSender } from "@/lib/email";
import type { StripeGateway } from "@/lib/stripe";
import { sendOrderConfirmation, sendOutOfStockNotice } from "./order-emails";
import { cancelPendingOrder, releaseCouponRedemption } from "./orders";

export type WebhookDeps = {
  db: PrismaClient;
  stripe: Pick<StripeGateway, "refunds">;
  sendEmail: EmailSender;
  siteUrl: string;
  now: () => Date;
  logger?: Pick<Console, "info" | "warn" | "error">;
};

export type WebhookOutcome =
  "paid" | "out_of_stock_refunded" | "cancelled" | "refunded" | "duplicate" | "ignored";

export type WebhookResult = { outcome: WebhookOutcome; orderId?: string; detail?: string };

type HandlerContext = {
  tx: DbClient;
  deps: WebhookDeps;
  now: Date;
  /** Side effects to run only after the transaction commits. */
  afterCommit: Array<() => Promise<unknown>>;
};

type Handler = (event: Stripe.Event, ctx: HandlerContext) => Promise<WebhookResult>;

function ignored(detail: string, orderId?: string): WebhookResult {
  return { outcome: "ignored", detail, orderId };
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function orderIdFromSession(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.orderId ?? session.client_reference_id ?? null;
}

function shippingAddressOf(session: Stripe.Checkout.Session): Prisma.InputJsonValue | undefined {
  const shipping = session.collected_information?.shipping_details;
  if (!shipping) return undefined;
  const { address, name } = shipping;
  return {
    name,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postal_code,
    country: address.country,
  };
}

/**
 * Takes stock for every line, or none. Rows are locked in variant-ID order so
 * concurrent orders sharing variants cannot deadlock. The conditional update
 * (`stock >= qty`) is atomic: the loser of a race for the last unit gets 0 rows.
 */
async function takeStock(
  tx: DbClient,
  items: ReadonlyArray<{ variantId: string | null; quantity: number }>,
): Promise<boolean> {
  const sorted = [...items].sort((a, b) => (a.variantId ?? "").localeCompare(b.variantId ?? ""));
  const taken: Array<{ variantId: string; quantity: number }> = [];
  for (const item of sorted) {
    const variantId = item.variantId;
    const result = variantId
      ? await tx.variant.updateMany({
          where: { id: variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
      : { count: 0 };
    if (result.count !== 1 || !variantId) {
      // Put back what this order already took (rows are still locked by us).
      for (const done of taken) {
        await tx.variant.update({
          where: { id: done.variantId },
          data: { stock: { increment: done.quantity } },
        });
      }
      return false;
    }
    taken.push({ variantId, quantity: item.quantity });
  }
  return true;
}

const handleCheckoutCompleted: Handler = async (event, { tx, deps, now, afterCommit }) => {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return ignored(`payment_status=${session.payment_status}`);

  const orderId = orderIdFromSession(session);
  const order = orderId
    ? await tx.order.findUnique({ where: { id: orderId }, include: { items: true } })
    : await tx.order.findUnique({
        where: { stripeCheckoutSessionId: session.id },
        include: { items: true },
      });
  if (!order) return ignored("no matching order");
  if (order.status !== "PENDING") return ignored(`order is ${order.status}`, order.id);

  const paymentIntentId = idOf(session.payment_intent);
  const email = session.customer_details?.email ?? order.email;
  const shippingAddress = shippingAddressOf(session);

  if (session.amount_total !== null && session.amount_total !== order.totalCents) {
    deps.logger?.warn(
      `[webhook] order ${order.id}: Stripe charged ${session.amount_total}, order total is ${order.totalCents}`,
    );
  }

  if (await takeStock(tx, order.items)) {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: now,
        email,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        ...(shippingAddress !== undefined && { shippingAddress }),
      },
    });
    afterCommit.push(() => sendOrderConfirmation(emailDeps(deps), order.id));
    return { outcome: "paid", orderId: order.id };
  }

  // Lost the race for the last unit(s): refund before committing. If the refund
  // call fails, the whole event rolls back and Stripe retries it; the
  // idempotency key makes the retry safe.
  if (!paymentIntentId) throw new Error(`Paid session ${session.id} has no payment intent`);
  await deps.stripe.refunds.create(
    { payment_intent: paymentIntentId, metadata: { orderId: order.id, reason: "out_of_stock" } },
    { idempotencyKey: `oos-refund-${order.id}` },
  );
  await tx.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      cancelReason: "out_of_stock",
      cancelledAt: now,
      email,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      ...(shippingAddress !== undefined && { shippingAddress }),
    },
  });
  if (order.couponId) await releaseCouponRedemption(tx, order.couponId);
  afterCommit.push(() => sendOutOfStockNotice(emailDeps(deps), order.id));
  return { outcome: "out_of_stock_refunded", orderId: order.id };
};

const handleCheckoutExpired: Handler = async (event, { tx, now }) => {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = orderIdFromSession(session);
  if (!orderId) return ignored("no orderId in session metadata");
  const cancelled = await cancelPendingOrder(tx, orderId, "checkout_expired", now);
  return cancelled ? { outcome: "cancelled", orderId } : ignored("order not pending", orderId);
};

const handleChargeRefunded: Handler = async (event, { tx, deps, now }) => {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId = idOf(charge.payment_intent);
  if (!paymentIntentId) return ignored("charge has no payment intent");

  const order = await tx.order.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
  if (!order) return ignored("no matching order");
  if (order.status === "REFUNDED") return ignored("already refunded", order.id);

  const fullyRefunded = charge.refunded || charge.amount_refunded >= charge.amount;
  if (!fullyRefunded) {
    deps.logger?.info(
      `[webhook] order ${order.id}: partial refund ${charge.amount_refunded}/${charge.amount}, status unchanged`,
    );
    return ignored("partial refund", order.id);
  }

  await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED", refundedAt: now } });
  return { outcome: "refunded", orderId: order.id };
};

const HANDLERS: Partial<Record<Stripe.Event.Type, Handler>> = {
  "checkout.session.completed": handleCheckoutCompleted,
  "checkout.session.expired": handleCheckoutExpired,
  "charge.refunded": handleChargeRefunded,
};

function emailDeps(deps: WebhookDeps) {
  return { db: deps.db, sendEmail: deps.sendEmail, siteUrl: deps.siteUrl, now: deps.now };
}

/**
 * Processes a verified Stripe event exactly once.
 *
 * The event ID is recorded in the same transaction as the handler's writes
 * (INSERT … ON CONFLICT DO NOTHING). A duplicate delivery inserts nothing and
 * is skipped; a concurrent duplicate waits on the row lock and then skips. If
 * the handler throws, the event row rolls back with it so Stripe's retry runs
 * the handler again.
 */
export async function processStripeEvent(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookResult> {
  const afterCommit: HandlerContext["afterCommit"] = [];

  const result = await deps.db.$transaction(
    async (tx): Promise<WebhookResult> => {
      const inserted = await tx.stripeEvent.createMany({
        data: [{ id: event.id, type: event.type }],
        skipDuplicates: true,
      });
      if (inserted.count === 0) return { outcome: "duplicate" };

      const handler = HANDLERS[event.type];
      if (!handler) return ignored(`unhandled event type ${event.type}`);
      return handler(event, { tx, deps, now: deps.now(), afterCommit });
    },
    { timeout: 15_000, maxWait: 10_000 },
  );

  for (const effect of afterCommit) {
    try {
      await effect();
    } catch (error) {
      // Emails are best-effort; the order state is already committed.
      deps.logger?.error(`[webhook] post-commit side effect failed for ${event.id}`, error);
    }
  }
  return result;
}
