import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { AuditHistory } from "@/components/admin/audit-history";
import { OrderActions } from "@/components/admin/order-actions";
import { OrderStatusBadge } from "@/components/shop/account/order-status-badge";
import { variantLabel } from "@/features/catalog/variant-labels";
import { requireAdminPage } from "@/features/admin/guard";
import { getAdminOrder } from "@/features/admin/orders/queries";
import { refundableCents, trackingUrl } from "@/features/admin/orders/transitions";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

type PageProps = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, locale } = (await params) as { id: string; locale: Locale };
  const t = await getTranslations({ locale, namespace: "admin.order" });
  const order = await db.order.findUnique({ where: { id }, select: { number: true } });
  return {
    title: order ? t("title", { number: formatOrderNumber(order.number) }) : t("fallbackTitle"),
  };
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

function Timestamp({ label, date, locale }: { label: string; date: Date | null; locale: Locale }) {
  if (!date) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{formatDate(date, locale, "dateTime")}</dd>
    </div>
  );
}

export default async function AdminOrderPage({ params }: PageProps) {
  const { id, locale } = (await params) as { id: string; locale: Locale };
  setRequestLocale(locale);
  const [t, ts] = await Promise.all([
    getTranslations("admin.order"),
    getTranslations("orderStatus.label"),
    requireAdminPage(`/admin/orders/${id}`),
  ]);
  const order = await getAdminOrder(db, id, locale);
  if (!order) notFound();

  const money = (cents: number) => formatMoney(cents, locale, order.currency);
  const parsedAddress = addressSchema.safeParse(order.shippingAddress ?? null);
  const address = parsedAddress.success ? parsedAddress.data : null;
  const tracking = trackingUrl(order.trackingCarrier, order.trackingNumber);
  const refundable = refundableCents(order);
  const number = formatOrderNumber(order.number);
  // Items snapshot the English name; show the current translation when there is one.
  const itemName = (item: (typeof order.items)[number]) =>
    item.variant?.product.translations[0]?.name || item.productName;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/orders" className="text-muted-foreground hover:text-foreground text-sm">
        <span aria-hidden className="inline-block rtl:-scale-x-100">
          ←
        </span>{" "}
        {t("back")}
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title", { number })}</h1>
        <OrderStatusBadge status={order.status} cancelReason={order.cancelReason} />
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="items-heading" className="bg-card rounded-xl border p-4">
            <h2 id="items-heading" className="mb-3 font-medium">
              {t("items")}
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
                          {itemName(item)}
                        </Link>
                      ) : (
                        itemName(item)
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {variantLabel(item.variantTitle, locale)} · <span dir="ltr">{item.sku}</span>{" "}
                      · {formatNumber(item.quantity, locale)} × {money(item.unitPriceCents)}
                      {item.restockedQuantity > 0 &&
                        ` · ${t("restocked", { count: item.restockedQuantity })}`}
                    </span>
                  </div>
                  <span className="tabular-nums">{money(item.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 flex flex-col gap-1 border-t pt-3 text-sm tabular-nums">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("subtotal")}</dt>
                <dd>{money(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {order.couponCode
                      ? t("discountWithCode", { code: order.couponCode })
                      : t("discount")}
                  </dt>
                  <dd>−{money(order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("shipping")}</dt>
                <dd>{money(order.shippingCents)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>{t("total")}</dt>
                <dd>{money(order.totalCents)}</dd>
              </div>
              {order.refundedCents > 0 && (
                <div className="text-danger flex justify-between" data-testid="refunded-amount">
                  <dt>{t("refunded")}</dt>
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
              label: `${itemName(item)} (${variantLabel(item.variantTitle, locale)})`,
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
              {t("customer")}
            </h2>
            <p dir={order.email ? "ltr" : undefined}>{order.email ?? t("noEmail")}</p>
            <p className="text-muted-foreground">
              {order.user
                ? t("account", { name: order.user.name ?? order.user.email })
                : t("guest")}
            </p>
            {address && (
              // US addresses keep their Latin, left-to-right layout.
              <address className="text-muted-foreground not-italic" dir="ltr">
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
              {t("paymentShipping")}
            </h2>
            <dl className="flex flex-col gap-1">
              <Timestamp label={t("placed")} date={order.createdAt} locale={locale} />
              <Timestamp label={ts("PAID")} date={order.paidAt} locale={locale} />
              <Timestamp label={ts("FULFILLED")} date={order.fulfilledAt} locale={locale} />
              <Timestamp label={ts("SHIPPED")} date={order.shippedAt} locale={locale} />
              <Timestamp label={ts("REFUNDED")} date={order.refundedAt} locale={locale} />
              <Timestamp label={ts("CANCELLED")} date={order.cancelledAt} locale={locale} />
            </dl>
            {order.trackingNumber && (
              <p>
                <span dir="ltr">
                  {order.trackingCarrier} {order.trackingNumber}
                </span>
                {tracking && (
                  <>
                    {" · "}
                    <a
                      href={tracking}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      {t("track")}
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
                {t("viewInStripe")}{" "}
                <ExternalLinkIcon className="size-3.5 rtl:-scale-x-100" aria-hidden />
              </a>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
