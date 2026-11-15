import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { z } from "zod";
import { OrderStatusBadge } from "@/components/shop/account/order-status-badge";
import { getCustomerOrder, orderStatusInfo, parseOrderNumber } from "@/features/account/orders";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number } = await params;
  return { title: `Order ${decodeURIComponent(number).toUpperCase()}` };
}

const shippingAddressSchema = z
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

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });
const STEPS = ["Paid", "Packed", "Shipped"] as const;

function Timeline({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Order progress">
      {STEPS.map((label, index) => {
        const done = index < step;
        return (
          <li
            key={label}
            className="flex items-center gap-2"
            aria-current={index === step - 1 ? "step" : undefined}
          >
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full border text-xs",
                done
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground",
              )}
            >
              {done ? <CheckIcon className="size-3.5" aria-hidden /> : index + 1}
            </span>
            <span className={done ? "font-medium" : "text-muted-foreground"}>{label}</span>
            {index < STEPS.length - 1 && (
              <span className="bg-border h-px w-6 sm:w-12" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { number: param } = await params;
  const user = await requireUser(`/account/orders/${param}`);
  const number = parseOrderNumber(decodeURIComponent(param));
  if (number === null) notFound();
  const order = await getCustomerOrder(db, user, number);
  if (!order) notFound();

  const info = orderStatusInfo(order.status, order.cancelReason);
  const money = (cents: number) => formatCents(cents, order.currency);
  const address = shippingAddressSchema.safeParse(order.shippingAddress ?? null);
  const shipping = address.success ? address.data : null;
  const reviewable = ["PAID", "FULFILLED", "SHIPPED"].includes(order.status);

  return (
    <article className="flex flex-col gap-6" aria-labelledby="order-heading">
      <Link href="/account/orders" className="text-muted-foreground hover:text-foreground text-sm">
        ← All orders
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="order-heading" className="text-xl font-semibold">
            Order {formatOrderNumber(order.number)}
          </h2>
          <p className="text-muted-foreground text-sm">
            Placed {dateFormatter.format(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} cancelReason={order.cancelReason} />
      </header>

      <div className="flex flex-col gap-3 rounded-xl border p-4">
        {info.step > 0 && <Timeline step={info.step} />}
        <p className="text-sm">{info.description}</p>
      </div>

      <section aria-labelledby="items-heading" className="flex flex-col gap-3">
        <h3 id="items-heading" className="font-medium">
          Items
        </h3>
        <ul className="divide-y rounded-xl border">
          {order.items.map((item) => {
            const product = item.variant?.product;
            const canReview = reviewable && product?.status === "ACTIVE";
            return (
              <li key={item.id} className="flex gap-3 p-4">
                <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-lg">
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">
                      {product?.status === "ACTIVE" ? (
                        <Link href={`/products/${product.slug}`} className="hover:underline">
                          {item.productName}
                        </Link>
                      ) : (
                        item.productName
                      )}
                    </span>
                    <span className="tabular-nums">{money(item.lineTotalCents)}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {item.variantTitle} · {item.quantity} × {money(item.unitPriceCents)}
                  </span>
                  {canReview && product && (
                    <Link
                      href={`/products/${product.slug}#reviews`}
                      className="self-start text-sm underline underline-offset-4"
                    >
                      Write a review
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="ship-heading" className="flex flex-col gap-2">
          <h3 id="ship-heading" className="font-medium">
            Shipping address
          </h3>
          {shipping ? (
            <address className="text-muted-foreground text-sm leading-relaxed not-italic">
              {shipping.name}
              <br />
              {shipping.line1}
              {shipping.line2 && (
                <>
                  <br />
                  {shipping.line2}
                </>
              )}
              <br />
              {shipping.city}, {shipping.state} {shipping.postalCode}
            </address>
          ) : (
            <p className="text-muted-foreground text-sm">Not available.</p>
          )}
        </section>
        <section aria-labelledby="totals-heading" className="flex flex-col gap-2">
          <h3 id="totals-heading" className="font-medium">
            Summary
          </h3>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right tabular-nums">{money(order.subtotalCents)}</dd>
            {order.discountCents > 0 && (
              <>
                <dt className="text-muted-foreground">
                  Discount{order.couponCode ? ` (${order.couponCode})` : ""}
                </dt>
                <dd className="text-right tabular-nums">−{money(order.discountCents)}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="text-right tabular-nums">
              {order.shippingCents === 0 ? "Free" : money(order.shippingCents)}
            </dd>
            <dt className="font-semibold">Total</dt>
            <dd className="text-right font-semibold tabular-nums">{money(order.totalCents)}</dd>
          </dl>
        </section>
      </div>
    </article>
  );
}
