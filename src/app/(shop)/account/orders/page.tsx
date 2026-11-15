import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/shop/account/order-status-badge";
import { listCustomerOrders } from "@/features/account/orders";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Orders" };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type PageProps = { searchParams: Promise<{ page?: string }> };

export default async function OrdersPage({ searchParams }: PageProps) {
  const user = await requireUser("/account/orders");
  const requested = Number((await searchParams).page ?? "1");
  const { orders, page, pageCount, total } = await listCustomerOrders(
    db,
    user,
    Number.isInteger(requested) ? requested : 1,
  );

  return (
    <section aria-labelledby="orders-heading" className="flex flex-col gap-4">
      <h2 id="orders-heading" className="text-xl font-semibold">
        Orders
      </h2>
      {total === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p>You haven’t placed any orders yet.</p>
          <Link href="/products" className={buttonVariants({ variant: "outline" })}>
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border" data-testid="order-list">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${formatOrderNumber(order.number)}`}
                className="hover:bg-muted/60 flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{formatOrderNumber(order.number)}</span>
                  <span className="text-muted-foreground text-sm">
                    {dateFormatter.format(order.createdAt)} · {order.itemCount} item
                    {order.itemCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={order.status} cancelReason={order.cancelReason} />
                  <span className="font-medium tabular-nums">
                    {formatCents(order.totalCents, order.currency)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pageCount > 1 && (
        <nav aria-label="Order pages" className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/account/orders?page=${page - 1}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Newer
            </Link>
          )}
          {page < pageCount && (
            <Link
              href={`/account/orders?page=${page + 1}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Older
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
