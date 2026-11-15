import { z } from "zod";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { parseOrderNumber } from "@/features/account/orders";
import type { DbClient } from "@/features/cart/quote";

export const ADMIN_ORDERS_PAGE_SIZE = 25;

export const ORDER_TABS = [
  "ALL",
  "PAID",
  "FULFILLED",
  "SHIPPED",
  "REFUNDED",
  "CANCELLED",
  "PENDING",
] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

const paramsSchema = z.object({
  status: z.enum(ORDER_TABS).optional().catch(undefined),
  q: z.string().trim().max(120).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});

export type AdminOrderFilters = { status: OrderTab; q?: string; page: number };

export function parseAdminOrderParams(
  params: Record<string, string | string[] | undefined>,
): AdminOrderFilters {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const parsed = paramsSchema.parse(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, first(value) || undefined]),
    ),
  );
  return { status: parsed.status ?? "ALL", q: parsed.q || undefined, page: parsed.page ?? 1 };
}

/** "All" hides abandoned checkouts (PENDING), which have their own tab. */
export function adminOrderWhere(filters: AdminOrderFilters): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (filters.status === "ALL") and.push({ status: { not: "PENDING" } });
  else and.push({ status: filters.status as OrderStatus });
  if (filters.q) {
    const number = parseOrderNumber(filters.q);
    and.push(
      number !== null ? { number } : { email: { contains: filters.q, mode: "insensitive" } },
    );
  }
  return { AND: and };
}

export async function listAdminOrders(db: DbClient, filters: AdminOrderFilters) {
  const where = adminOrderWhere(filters);
  const total = await db.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const rows = await db.order.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * ADMIN_ORDERS_PAGE_SIZE,
    take: ADMIN_ORDERS_PAGE_SIZE,
    select: {
      id: true,
      number: true,
      email: true,
      status: true,
      cancelReason: true,
      currency: true,
      totalCents: true,
      refundedCents: true,
      createdAt: true,
      paidAt: true,
      trackingNumber: true,
      items: { select: { quantity: true } },
    },
  });
  return {
    orders: rows.map(({ items, ...order }) => ({
      ...order,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    })),
    total,
    page,
    pageCount,
  };
}

export async function getAdminOrder(db: DbClient, id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      items: {
        orderBy: { id: "asc" },
        include: {
          variant: {
            select: { stock: true, product: { select: { id: true, slug: true, name: true } } },
          },
        },
      },
    },
  });
}
