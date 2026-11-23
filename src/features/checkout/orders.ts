import { dedupeItems, type CartItem } from "@/features/cart/cart";
import {
  findCoupon,
  lineStatus,
  loadPurchasableVariants,
  type DbClient,
} from "@/features/cart/quote";
import { COUPON_MESSAGES, evaluateCoupon } from "./coupons";
import { computeOrderTotals, lineTotalCents } from "./pricing";

export type CancelReason = "checkout_expired" | "out_of_stock" | "payment_failed";

export type CartProblem = {
  variantId: string;
  status: "insufficient" | "unavailable";
  available: number;
};

export type CreatePendingOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: "empty_cart" }
  | { ok: false; error: "cart_changed"; problems: CartProblem[] }
  | { ok: false; error: "coupon_rejected"; message: string };

export type CreatePendingOrderInput = {
  items: readonly CartItem[];
  couponCode?: string | null;
  userId?: string | null;
  email?: string | null;
  /** Storefront language; emails about this order are sent in it. */
  locale?: string;
  now: Date;
};

/**
 * Reserves one redemption. The conditional update is atomic, so two shoppers
 * racing for the last redemption cannot both get it.
 */
async function reserveCouponRedemption(
  tx: DbClient,
  coupon: { id: string; maxRedemptions: number | null },
): Promise<boolean> {
  const result = await tx.coupon.updateMany({
    where:
      coupon.maxRedemptions === null
        ? { id: coupon.id }
        : { id: coupon.id, redemptionCount: { lt: coupon.maxRedemptions } },
    data: { redemptionCount: { increment: 1 } },
  });
  return result.count === 1;
}

export async function releaseCouponRedemption(tx: DbClient, couponId: string): Promise<void> {
  await tx.coupon.updateMany({
    where: { id: couponId, redemptionCount: { gt: 0 } },
    data: { redemptionCount: { decrement: 1 } },
  });
}

/**
 * Creates a PENDING order from the cart. Every price comes from the database;
 * the input only carries variant IDs, quantities and a coupon code.
 * Run inside a transaction so a failed coupon reservation leaves no order behind.
 */
export async function createPendingOrder(
  tx: DbClient,
  input: CreatePendingOrderInput,
): Promise<CreatePendingOrderResult> {
  const items = dedupeItems(input.items);
  if (items.length === 0) return { ok: false, error: "empty_cart" };

  const variants = await loadPurchasableVariants(
    tx,
    items.map((item) => item.variantId),
  );
  const problems = items.flatMap((item): CartProblem[] => {
    const variant = variants.get(item.variantId);
    const status = lineStatus(variant, item.quantity);
    return status === "ok"
      ? []
      : [{ variantId: item.variantId, status, available: variant?.stock ?? 0 }];
  });
  if (problems.length > 0) return { ok: false, error: "cart_changed", problems };

  const lines = items.map((item) => {
    const variant = variants.get(item.variantId);
    if (!variant) throw new Error(`Variant ${item.variantId} disappeared`);
    return { item, variant };
  });
  const priced = lines.map(({ item, variant }) => ({
    unitPriceCents: variant.priceCents,
    quantity: item.quantity,
  }));
  const baseTotals = computeOrderTotals(priced);

  let coupon: { id: string; code: string } | null = null;
  let totals = baseTotals;
  if (input.couponCode?.trim()) {
    const evaluation = evaluateCoupon(await findCoupon(tx, input.couponCode), {
      subtotalCents: baseTotals.subtotalCents,
      now: input.now,
    });
    if (!evaluation.ok) {
      return { ok: false, error: "coupon_rejected", message: COUPON_MESSAGES[evaluation.reason] };
    }
    if (!(await reserveCouponRedemption(tx, evaluation.coupon))) {
      return { ok: false, error: "coupon_rejected", message: COUPON_MESSAGES.usage_limit_reached };
    }
    coupon = { id: evaluation.coupon.id, code: evaluation.coupon.code };
    totals = computeOrderTotals(priced, evaluation.discount);
  }

  const order = await tx.order.create({
    data: {
      userId: input.userId ?? null,
      email: input.email ?? null,
      status: "PENDING",
      currency: "usd",
      locale: input.locale ?? "en",
      ...totals,
      couponId: coupon?.id ?? null,
      couponCode: coupon?.code ?? null,
      items: {
        create: lines.map(({ item, variant }) => ({
          variantId: variant.id,
          productName: variant.product.name,
          variantTitle: variant.title,
          sku: variant.sku,
          imageUrl: variant.imageUrl,
          unitPriceCents: variant.priceCents,
          quantity: item.quantity,
          lineTotalCents: lineTotalCents({
            unitPriceCents: variant.priceCents,
            quantity: item.quantity,
          }),
        })),
      },
    },
    select: { id: true },
  });
  return { ok: true, orderId: order.id };
}

/**
 * Cancels an order only if it is still PENDING and releases its coupon.
 * Returns false when the order was already finalized (idempotent).
 */
export async function cancelPendingOrder(
  tx: DbClient,
  orderId: string,
  reason: CancelReason,
  now: Date,
): Promise<boolean> {
  const result = await tx.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "CANCELLED", cancelReason: reason, cancelledAt: now },
  });
  if (result.count === 0) return false;
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { couponId: true } });
  if (order?.couponId) await releaseCouponRedemption(tx, order.couponId);
  return true;
}
