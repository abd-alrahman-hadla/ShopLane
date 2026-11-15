import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { z } from "zod";
import { AuditHistory } from "@/components/admin/audit-history";
import { OrderActions } from "@/components/admin/order-actions";
import { OrderStatusBadge } from "@/components/shop/account/order-status-badge";
import { requireAdminPage } from "@/features/admin/guard";
import { getAdminOrder } from "@/features/admin/orders/queries";
import { refundableCents, trackingUrl } from "@/features/admin/orders/transitions";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, select: { number: true } });
  return { title: order ? `Order ${formatOrderNumber(order.number)}` : "Order" };
}

const addressSchema = z
  .object({
    name: z.string().nullish(),
    line1: z.string().nullish(),
    line2: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    postalCode: z.string().nullish(),
    country: z.string().nullish(),
  })
  .nullable();

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function Timestamp({ label, date }: { label: string; date: Date | null }) {
  if (!date) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{dateTime.format(date)}</dd>
    </div>
  );
}

export default async function AdminOrderPage({ params }: PageProps) {
  const { id } = await params;
  await requireAdminPage(`/admin/orders/${id}`);
  const order = await getAdminOrder(db, id);
  if (!order) notFound();

  const money = (cents: number) => formatCents(cents, order.currency);
  const parsedAddress = addressSchema.safeParse(order.shippingAddress ?? null);
  const address = parsedAddress.success ? parsedAddress.data : null;
  const tracking = trackingUrl(order.trackingCarrier, order.trackingNumber);
  const refundable = refundableCents(order);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/orders" className="text-muted-foreground hover:text-foreground text-sm">
        ← Orders
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Order {formatOrderNumber(order.number)}
        </h1>
        <OrderStatusBadge status={order.status} cancelReason={order.cancelReason} />
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="items-heading" className="bg-card rounded-xl border p-4">
            <h2 id="items-heading" className="mb-3 font-medium">
              Items
            </h2>
            <ul className="divide-y text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3">
                  <div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-md">
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">
                      {item.variant ? (
                        <Link
                          href={`/admin/products/${item.variant.product.id}`}
                          className="hover:underline"
                        >
                          {item.productName}
                        </Link>
                      ) : (
                        item.productName
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {item.variantTitle} · {item.sku} · {item.quantity} ×{" "}
                      {money(item.unitPriceCents)}
                      {item.restockedQuantity > 0 && ` · ${item.restockedQuantity} restocked`}
                    </span>
                  </div>
                  <span className="tabular-nums">{money(item.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 flex flex-col gap-1 border-t pt-3 text-sm tabular-nums">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Discount{order.couponCode ? ` (${order.couponCode})` : ""}
                  </dt>
                  <dd>−{money(order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{money(order.shippingCents)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd>{money(order.totalCents)}</dd>
              </div>
              {order.refundedCents > 0 && (
                <div className="flex justify-between text-red-800" data-testid="refunded-amount">
                  <dt>Refunded</dt>
                  <dd>−{money(order.refundedCents)}</dd>
                </div>
              )}
            </dl>
          </section>
          <AuditHistory entityType="Order" entityId={order.id} />
        </div>

        <div className="flex flex-col gap-4">
          <OrderActions
            orderId={order.id}
            status={order.status}
            currency={order.currency}
            refundableCents={refundable}
            canRefund={Boolean(order.stripePaymentIntentId)}
            trackingCarrier={order.trackingCarrier}
            trackingNumber={order.trackingNumber}
            items={order.items.map((item) => ({
              id: item.id,
              label: `${item.productName} (${item.variantTitle})`,
              quantity: item.quantity,
              restockedQuantity: item.restockedQuantity,
              canRestock: Boolean(item.variantId) && item.quantity > item.restockedQuantity,
            }))}
          />

          <section
            aria-labelledby="customer-heading"
            className="bg-card flex flex-col gap-2 rounded-xl border p-4 text-sm"
          >
            <h2 id="customer-heading" className="font-medium">
              Customer
            </h2>
            <p>{order.email ?? "No email yet (checkout not completed)"}</p>
            <p className="text-muted-foreground">
              {order.user ? `Account: ${order.user.name ?? order.user.email}` : "Guest checkout"}
            </p>
            {address && (
              <address className="text-muted-foreground not-italic">
                {address.name}
                <br />
                {address.line1}
                {address.line2 && (
                  <>
                    <br />
                    {address.line2}
                  </>
                )}
                <br />
                {address.city}, {address.state} {address.postalCode}
              </address>
            )}
          </section>

          <section
            aria-labelledby="payment-heading"
            className="bg-card flex flex-col gap-2 rounded-xl border p-4 text-sm"
          >
            <h2 id="payment-heading" className="font-medium">
              Payment &amp; shipping
            </h2>
            <dl className="flex flex-col gap-1">
              <Timestamp label="Placed" date={order.createdAt} />
              <Timestamp label="Paid" date={order.paidAt} />
              <Timestamp label="Packed" date={order.fulfilledAt} />
              <Timestamp label="Shipped" date={order.shippedAt} />
              <Timestamp label="Refunded" date={order.refundedAt} />
              <Timestamp label="Cancelled" date={order.cancelledAt} />
            </dl>
            {order.trackingNumber && (
              <p>
                {order.trackingCarrier} {order.trackingNumber}
                {tracking && (
                  <>
                    {" · "}
                    <a
                      href={tracking}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      Track
                    </a>
                  </>
                )}
              </p>
            )}
            {order.stripePaymentIntentId && (
              <a
                href={`https://dashboard.stripe.com/test/payments/${order.stripePaymentIntentId}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View in Stripe <ExternalLinkIcon className="size-3.5" aria-hidden />
              </a>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
