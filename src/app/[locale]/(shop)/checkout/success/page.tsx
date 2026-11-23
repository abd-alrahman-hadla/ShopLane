import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { ClearCartOnMount, PaymentPoller } from "@/components/shop/checkout/order-status-client";
import { variantLabel } from "@/features/catalog/variant-labels";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/format";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("pageTitle"), robots: { index: false } };
}

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

export default async function CheckoutSuccessPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const { session_id: sessionId } = await searchParams;
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) notFound();
  const [t, order] = await Promise.all([getTranslations("checkout"), loadOrder(sessionId)]);
  if (!order) notFound();

  const number = formatOrderNumber(order.number);
  const money = (cents: number) => formatMoney(cents, locale, order.currency);

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
            <h1 className="text-2xl font-semibold tracking-tight">{t("confirming")}</h1>
            <p className="text-muted-foreground">{t("confirmingHint")}</p>
          </>
        ) : order.status === "CANCELLED" || order.status === "REFUNDED" ? (
          <>
            <XCircleIcon className="text-destructive size-10" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight">{t("failed", { number })}</h1>
            <p className="text-muted-foreground">
              {order.cancelReason === "out_of_stock" ? t("soldOutRefunded") : t("cancelled")}
            </p>
          </>
        ) : (
          <>
            <CheckCircle2Icon className="text-success size-10" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight">{t("confirmed", { number })}</h1>
            {order.email && (
              <p className="text-muted-foreground">
                {t("emailSent", { email: maskEmail(order.email) })}
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
          {t("summary")}
        </h2>
        <ul className="divide-y text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-2">
              <span>
                {formatNumber(item.quantity, locale)} × {item.productName}{" "}
                <span className="text-muted-foreground">
                  ({variantLabel(item.variantTitle, locale)})
                </span>
              </span>
              <span className="tabular-nums">{money(item.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-y-1 border-t pt-3 text-sm">
          <dt className="text-muted-foreground">{t("subtotal")}</dt>
          <dd className="text-end tabular-nums">{money(order.subtotalCents)}</dd>
          {order.discountCents > 0 && (
            <>
              <dt className="text-muted-foreground">
                {order.couponCode
                  ? t("discountWithCode", { code: order.couponCode })
                  : t("discount")}
              </dt>
              <dd className="text-end tabular-nums">−{money(order.discountCents)}</dd>
            </>
          )}
          <dt className="text-muted-foreground">{t("shipping")}</dt>
          <dd className="text-end tabular-nums">
            {order.shippingCents === 0 ? t("free") : money(order.shippingCents)}
          </dd>
          <dt className="font-semibold">{t("total")}</dt>
          <dd className="text-end font-semibold tabular-nums">{money(order.totalCents)}</dd>
        </dl>
      </section>

      <Link
        href="/products"
        className={buttonVariants({ variant: "outline", className: "self-center" })}
      >
        {t("continue")}
      </Link>
    </div>
  );
}
