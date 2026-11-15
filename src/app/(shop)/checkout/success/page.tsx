import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ClearCartOnMount, PaymentPoller } from "@/components/shop/checkout/order-status-client";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false },
};

type PageProps = { searchParams: Promise<{ session_id?: string }> };

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}${"•".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

async function loadOrder(sessionId: string) {
  return db.order.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    include: { items: { orderBy: { id: "asc" } } },
  });
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) notFound();
  const order = await loadOrder(sessionId);
  if (!order) notFound();

  const number = formatOrderNumber(order.number);
  const money = (cents: number) => formatCents(cents, order.currency);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-12 sm:px-6">
      <ClearCartOnMount />
      {order.status === "PENDING" && <PaymentPoller />}

      <header
        className="flex flex-col items-center gap-3 text-center"
        data-testid="order-status"
        data-status={order.status}
      >
        {order.status === "PENDING" ? (
          <>
            <Loader2Icon className="text-muted-foreground size-10 animate-spin" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight">Confirming your payment…</h1>
            <p className="text-muted-foreground">
              This usually takes a few seconds. You can keep this page open.
            </p>
          </>
        ) : order.status === "CANCELLED" || order.status === "REFUNDED" ? (
          <>
            <XCircleIcon className="text-destructive size-10" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight">
              We couldn’t complete order {number}
            </h1>
            <p className="text-muted-foreground">
              {order.cancelReason === "out_of_stock"
                ? "An item sold out just before your payment went through. We’ve refunded you in full; it can take 5–10 business days to appear."
                : "This order was cancelled and you haven’t been charged."}
            </p>
          </>
        ) : (
          <>
            <CheckCircle2Icon className="size-10 text-emerald-700" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight">
              Thank you! Order {number} is confirmed
            </h1>
            {order.email && (
              <p className="text-muted-foreground">
                A confirmation email is on its way to {maskEmail(order.email)}.
              </p>
            )}
          </>
        )}
      </header>

      <section
        aria-labelledby="summary-heading"
        className="flex flex-col gap-3 rounded-xl border p-5"
      >
        <h2 id="summary-heading" className="font-medium">
          Order summary
        </h2>
        <ul className="divide-y text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-2">
              <span>
                {item.quantity} × {item.productName}{" "}
                <span className="text-muted-foreground">({item.variantTitle})</span>
              </span>
              <span className="tabular-nums">{money(item.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-y-1 border-t pt-3 text-sm">
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

      <Link
        href="/products"
        className={buttonVariants({ variant: "outline", className: "self-center" })}
      >
        Continue shopping
      </Link>
    </div>
  );
}
