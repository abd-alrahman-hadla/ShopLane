import type { DbClient } from "@/features/cart/quote";
import { LOW_STOCK_THRESHOLD, STORE_TIME_ZONE } from "@/lib/store";
import { bucketRevenueByDay, dayKey, revenueWindows, shiftDayKey, type PaidOrder } from "./metrics";

const REVENUE_STATUSES = ["PAID", "FULFILLED", "SHIPPED", "REFUNDED"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TopProduct = {
  key: string;
  productId: string | null;
  name: string;
  units: number;
  revenueCents: number;
};

export type LowStockVariant = {
  id: string;
  sku: string;
  title: string;
  stock: number;
  productId: string;
  productName: string;
};

/** Everything the dashboard shows, computed for `now` in the store's time zone. */
export async function getDashboardData(db: DbClient, now: Date = new Date()) {
  // 61 days covers the 30-day window and the 30 days before it, in any time zone.
  const since = new Date(now.getTime() - 61 * DAY_MS);
  const orders = await db.order.findMany({
    where: { status: { in: [...REVENUE_STATUSES] }, paidAt: { gte: since } },
    select: {
      paidAt: true,
      totalCents: true,
      refundedCents: true,
      items: {
        select: {
          productName: true,
          quantity: true,
          lineTotalCents: true,
          variant: { select: { product: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  const paid: PaidOrder[] = orders.flatMap((order) =>
    order.paidAt
      ? [{ paidAt: order.paidAt, totalCents: order.totalCents, refundedCents: order.refundedCents }]
      : [],
  );
  const windows = revenueWindows(paid, { now, timeZone: STORE_TIME_ZONE });
  const daily = bucketRevenueByDay(paid, { now, timeZone: STORE_TIME_ZONE, days: 30 });

  const firstKey = shiftDayKey(dayKey(now, STORE_TIME_ZONE), -29);
  const top = new Map<string, TopProduct>();
  for (const order of orders) {
    if (!order.paidAt || dayKey(order.paidAt, STORE_TIME_ZONE) < firstKey) continue;
    for (const item of order.items) {
      const product = item.variant?.product ?? null;
      const key = product?.id ?? `name:${item.productName}`;
      const entry = top.get(key) ?? {
        key,
        productId: product?.id ?? null,
        name: product?.name ?? item.productName,
        units: 0,
        revenueCents: 0,
      };
      entry.units += item.quantity;
      entry.revenueCents += item.lineTotalCents;
      top.set(key, entry);
    }
  }
  const topProducts = [...top.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents || b.units - a.units)
    .slice(0, 5);

  const lowStockRows = await db.variant.findMany({
    where: { stock: { lte: LOW_STOCK_THRESHOLD }, product: { status: "ACTIVE" } },
    orderBy: [{ stock: "asc" }, { sku: "asc" }],
    take: 12,
    select: {
      id: true,
      sku: true,
      title: true,
      stock: true,
      product: { select: { id: true, name: true } },
    },
  });
  const lowStock: LowStockVariant[] = lowStockRows.map((row) => ({
    id: row.id,
    sku: row.sku,
    title: row.title,
    stock: row.stock,
    productId: row.product.id,
    productName: row.product.name,
  }));

  return { windows, daily, topProducts, lowStock };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
