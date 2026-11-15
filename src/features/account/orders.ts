import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import type { DbClient } from "@/features/cart/quote";

export type CustomerIdentity = { id: string; email: string };

/** Statuses that mean the customer paid and still has the goods (or will). */
export const PURCHASED_STATUSES = ["PAID", "FULFILLED", "SHIPPED"] as const satisfies OrderStatus[];

export const ORDERS_PAGE_SIZE = 20;

/**
 * Orders that belong to a customer: placed while signed in, or as a guest with
 * the same (magic-link verified) email address.
 */
export function customerOwnershipWhere(user: CustomerIdentity): Prisma.OrderWhereInput {
  return {
    OR: [{ userId: user.id }, { userId: null, email: { equals: user.email, mode: "insensitive" } }],
  };
}

/**
 * Orders shown in the account. Abandoned checkouts (PENDING, or cancelled
 * before payment) are hidden; an out-of-stock cancellation was paid and refunded,
 * so it stays visible.
 */
export function visibleOrderWhere(user: CustomerIdentity): Prisma.OrderWhereInput {
  return {
    AND: [
      customerOwnershipWhere(user),
      {
        OR: [
          { status: { in: [...PURCHASED_STATUSES, "REFUNDED"] } },
          { status: "CANCELLED", cancelReason: "out_of_stock" },
        ],
      },
    ],
  };
}

/** "SL-0007" (case-insensitive) → 7. Anything else → null. */
export function parseOrderNumber(value: string): number | null {
  const match = /^SL-(\d{1,9})$/i.exec(value.trim());
  if (!match?.[1]) return null;
  const number = Number(match[1]);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export type StatusTone = "neutral" | "info" | "success" | "danger";

export type OrderStatusInfo = {
  label: string;
  tone: StatusTone;
  /** Progress through Paid → Fulfilled → Shipped (1–3); 0 when the order did not proceed. */
  step: 0 | 1 | 2 | 3;
  description: string;
};

export function orderStatusInfo(status: OrderStatus, cancelReason: string | null): OrderStatusInfo {
  switch (status) {
    case "PAID":
      return { label: "Paid", tone: "info", step: 1, description: "We’re preparing your order." };
    case "FULFILLED":
      return { label: "Packed", tone: "info", step: 2, description: "Packed and ready to ship." };
    case "SHIPPED":
      return { label: "Shipped", tone: "success", step: 3, description: "On its way to you." };
    case "REFUNDED":
      return {
        label: "Refunded",
        tone: "neutral",
        step: 0,
        description: "This order was refunded.",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        tone: "danger",
        step: 0,
        description:
          cancelReason === "out_of_stock"
            ? "An item sold out before your payment completed, so we refunded you."
            : "This order was cancelled.",
      };
    case "PENDING":
      return {
        label: "Awaiting payment",
        tone: "neutral",
        step: 0,
        description: "Payment not completed.",
      };
  }
}

const orderSummarySelect = {
  id: true,
  number: true,
  status: true,
  cancelReason: true,
  currency: true,
  totalCents: true,
  createdAt: true,
  items: { select: { quantity: true } },
} satisfies Prisma.OrderSelect;

export async function listCustomerOrders(db: DbClient, user: CustomerIdentity, page: number) {
  const where = visibleOrderWhere(user);
  const total = await db.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);
  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (current - 1) * ORDERS_PAGE_SIZE,
    take: ORDERS_PAGE_SIZE,
    select: orderSummarySelect,
  });
  return {
    orders: orders.map(({ items, ...order }) => ({
      ...order,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    })),
    total,
    page: current,
    pageCount,
  };
}

/** One of the customer's orders by number, or null (never reveals other customers' orders). */
export async function getCustomerOrder(db: DbClient, user: CustomerIdentity, number: number) {
  return db.order.findFirst({
    where: { AND: [{ number }, visibleOrderWhere(user)] },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          variant: { select: { product: { select: { id: true, slug: true, status: true } } } },
        },
      },
    },
  });
}
