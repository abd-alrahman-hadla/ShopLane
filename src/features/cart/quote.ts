import type { Prisma } from "@/generated/prisma/client";
import {
  COUPON_MESSAGES,
  evaluateCoupon,
  normalizeCouponCode,
  type CouponEvaluation,
} from "@/features/checkout/coupons";
import { computeOrderTotals, lineTotalCents, type OrderTotals } from "@/features/checkout/pricing";
import { dedupeItems, type CartItem } from "./cart";

export type DbClient = Prisma.TransactionClient;

export type PurchasableVariant = {
  id: string;
  sku: string;
  title: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  product: { id: string; slug: string; name: string };
  imageUrl: string | null;
  imageAlt: string | null;
};

/** Variants of ACTIVE products only, with their current DB price and stock. */
export async function loadPurchasableVariants(
  db: DbClient,
  variantIds: readonly string[],
): Promise<Map<string, PurchasableVariant>> {
  if (variantIds.length === 0) return new Map();
  const rows = await db.variant.findMany({
    where: { id: { in: [...variantIds] }, product: { status: "ACTIVE" } },
    select: {
      id: true,
      sku: true,
      title: true,
      priceCents: true,
      compareAtPriceCents: true,
      stock: true,
      images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
        },
      },
    },
  });
  return new Map(
    rows.map((row) => {
      const image = row.images[0] ?? row.product.images[0] ?? null;
      return [
        row.id,
        {
          id: row.id,
          sku: row.sku,
          title: row.title,
          priceCents: row.priceCents,
          compareAtPriceCents: row.compareAtPriceCents,
          stock: row.stock,
          product: { id: row.product.id, slug: row.product.slug, name: row.product.name },
          imageUrl: image?.url ?? null,
          imageAlt: image?.alt ?? null,
        },
      ];
    }),
  );
}

export async function findCoupon(db: DbClient, code: string) {
  return db.coupon.findUnique({ where: { code: normalizeCouponCode(code) } });
}

export type CartLineStatus = "ok" | "insufficient" | "unavailable";

export type CartQuoteLine = {
  variantId: string;
  quantity: number;
  status: CartLineStatus;
  /** Present unless the variant is gone or its product is no longer active. */
  variant: PurchasableVariant | null;
  lineTotalCents: number;
};

export type CouponSummary =
  | { code: string; status: "applied"; discountCents: number }
  | { code: string; status: "rejected"; message: string };

export type CartQuote = {
  lines: CartQuoteLine[];
  totals: OrderTotals;
  coupon: CouponSummary | null;
  canCheckout: boolean;
};

export function lineStatus(
  variant: PurchasableVariant | undefined,
  quantity: number,
): CartLineStatus {
  if (!variant) return "unavailable";
  return variant.stock >= quantity ? "ok" : "insufficient";
}

function summarizeCoupon(
  code: string,
  evaluation: CouponEvaluation,
  discountCents: number,
): CouponSummary {
  if (evaluation.ok) return { code: evaluation.coupon.code, status: "applied", discountCents };
  return {
    code: normalizeCouponCode(code),
    status: "rejected",
    message: COUPON_MESSAGES[evaluation.reason],
  };
}

/**
 * Prices a cart from the database. Totals cover purchasable lines only;
 * checkout is blocked until every line is purchasable.
 */
export async function buildCartQuote(
  db: DbClient,
  input: { items: readonly CartItem[]; couponCode?: string | null; now: Date },
): Promise<CartQuote> {
  const items = dedupeItems(input.items);
  const variants = await loadPurchasableVariants(
    db,
    items.map((item) => item.variantId),
  );

  const lines: CartQuoteLine[] = items.map((item) => {
    const variant = variants.get(item.variantId);
    const status = lineStatus(variant, item.quantity);
    return {
      variantId: item.variantId,
      quantity: item.quantity,
      status,
      variant: variant ?? null,
      lineTotalCents:
        status === "ok" && variant
          ? lineTotalCents({ unitPriceCents: variant.priceCents, quantity: item.quantity })
          : 0,
    };
  });

  const priced = lines.flatMap((line) =>
    line.status === "ok" && line.variant
      ? [{ unitPriceCents: line.variant.priceCents, quantity: line.quantity }]
      : [],
  );
  const baseTotals = computeOrderTotals(priced);

  let coupon: CouponSummary | null = null;
  let totals = baseTotals;
  const code = input.couponCode?.trim();
  if (code) {
    const evaluation = evaluateCoupon(await findCoupon(db, code), {
      subtotalCents: baseTotals.subtotalCents,
      now: input.now,
    });
    if (evaluation.ok) totals = computeOrderTotals(priced, evaluation.discount);
    coupon = summarizeCoupon(code, evaluation, totals.discountCents);
  }

  return {
    lines,
    totals,
    coupon,
    canCheckout: lines.length > 0 && lines.every((line) => line.status === "ok"),
  };
}
