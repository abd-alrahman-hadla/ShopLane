import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListPagination } from "@/components/admin/list-pagination";
import { OrderStatusBadge } from "@/components/shop/account/order-status-badge";
import { requireAdminPage } from "@/features/admin/guard";
import {
  ORDER_TABS,
  listAdminOrders,
  parseAdminOrderParams,
  type OrderTab,
} from "@/features/admin/orders/queries";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TAB_LABELS: Record<OrderTab, string> = {
  ALL: "All",
  PAID: "Paid",
  FULFILLED: "Packed",
  SHIPPED: "Shipped",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
  PENDING: "Abandoned",
};

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  await requireAdminPage("/admin/orders");
  const filters = parseAdminOrderParams(await searchParams);
  const { orders, total, page, pageCount } = await listAdminOrders(db, filters);
  const tabHref = (tab: OrderTab) => {
    const params = new URLSearchParams();
    if (tab !== "ALL") params.set("status", tab);
    if (filters.q) params.set("q", filters.q);
    const query = params.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>

      <nav aria-label="Order status" className="flex gap-1 overflow-x-auto border-b">
        {ORDER_TABS.map((tab) => (
          <Link
            key={tab}
            href={tabHref(tab)}
            aria-current={filters.status === tab ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              filters.status === tab
                ? "border-primary font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {TAB_LABELS[tab]}
          </Link>
        ))}
      </nav>

      <Form action="/admin/orders" className="flex flex-wrap gap-2">
        {filters.status !== "ALL" && <input type="hidden" name="status" value={filters.status} />}
        <Input
          name="q"
          defaultValue={filters.q}
          placeholder="SL-0042 or customer email"
          aria-label="Search orders"
          className="max-w-xs"
        />
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Search
        </button>
      </Form>

      <p className="text-muted-foreground text-sm">
        {total} order{total === 1 ? "" : "s"}
      </p>
      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[40rem] text-sm" data-testid="admin-orders">
          <thead className="text-muted-foreground border-b text-left">
            <tr>
              <th scope="col" className="p-3 font-normal">
                Order
              </th>
              <th scope="col" className="p-3 font-normal">
                Placed
              </th>
              <th scope="col" className="p-3 font-normal">
                Customer
              </th>
              <th scope="col" className="p-3 font-normal">
                Status
              </th>
              <th scope="col" className="p-3 text-right font-normal">
                Items
              </th>
              <th scope="col" className="p-3 text-right font-normal">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/40 border-t">
                <td className="p-3">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                    {formatOrderNumber(order.number)}
                  </Link>
                </td>
                <td className="text-muted-foreground p-3">{dateFormat.format(order.createdAt)}</td>
                <td className="p-3">
                  {order.email ?? <span className="text-muted-foreground">Guest (pending)</span>}
                </td>
                <td className="p-3">
                  <OrderStatusBadge status={order.status} cancelReason={order.cancelReason} />
                  {order.refundedCents > 0 && order.status !== "REFUNDED" && (
                    <span className="text-muted-foreground ml-2 text-xs">partly refunded</span>
                  )}
                </td>
                <td className="p-3 text-right tabular-nums">{order.itemCount}</td>
                <td className="p-3 text-right tabular-nums">
                  {formatCents(order.totalCents, order.currency)}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground p-6 text-center">
                  No orders here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ListPagination
        basePath="/admin/orders"
        params={{ status: filters.status === "ALL" ? undefined : filters.status, q: filters.q }}
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}
