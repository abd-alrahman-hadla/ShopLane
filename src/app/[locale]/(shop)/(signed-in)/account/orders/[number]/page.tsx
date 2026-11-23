import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { OrderStatusBadge } from "@/components/shop/account/order-status-badge";
import { getCustomerOrder, orderStatusInfo, parseOrderNumber } from "@/features/account/orders";
import { variantLabel } from "@/features/catalog/variant-labels";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ locale: string; number: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number, locale } = (await params) as { number: string; locale: Locale };
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("orderTitle", { number: decodeURIComponent(number).toUpperCase() }) };
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

const STEPS = ["PAID", "FULFILLED", "SHIPPED"] as const;

async function Timeline({ step }: { step: number }) {
  const t = await getTranslations("orderStatus");
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label={t("progress")}>
      {STEPS.map((status, index) => {
        const done = index < step;
        return (
          <li
            key={status}
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
            <span className={done ? "font-medium" : "text-muted-foreground"}>
              {t(`label.${status}`)}
            </span>
            {index < STEPS.length - 1 && (
              <span className="bg-border h-px w-6 sm:w-12" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Order lines keep the English name they were bought under; show the shopper's language when we have it. */
async function translatedNames(productIds: string[], locale: Locale): Promise<Map<string, string>> {
  if (locale === "en" || productIds.length === 0) return new Map();
  const rows = await db.productTranslation.findMany({
    where: { productId: { in: productIds }, locale },
    select: { productId: true, name: true },
  });
  return new Map(rows.map((row) => [row.productId, row.name]));
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { number: param, locale } = (await params) as { number: string; locale: Locale };
  setRequestLocale(locale);
  const [t, ts, user] = await Promise.all([
    getTranslations("account"),
    getTranslations("orderStatus"),
    requireUser(`/account/orders/${param}`),
  ]);
  const number = parseOrderNumber(decodeURIComponent(param));
  if (number === null) notFound();
  const order = await getCustomerOrder(db, user, number);
  if (!order) notFound();

  const info = orderStatusInfo(order.status, order.cancelReason);
  const money = (cents: number) => formatMoney(cents, locale, order.currency);
  const address = shippingAddressSchema.safeParse(order.shippingAddress ?? null);
  const shipping = address.success ? address.data : null;
  const reviewable = ["PAID", "FULFILLED", "SHIPPED"].includes(order.status);
  const names = await translatedNames(
    order.items.flatMap((item) => (item.variant?.product ? [item.variant.product.id] : [])),
    locale,
  );
  const description =
    order.status === "CANCELLED" && order.cancelReason === "out_of_stock"
      ? ts("description.CANCELLED_out_of_stock")
      : ts(`description.${order.status}`);

  return (
    <article className="flex flex-col gap-6" aria-labelledby="order-heading">
      <Link href="/account/orders" className="text-muted-foreground hover:text-foreground text-sm">
        <span aria-hidden className="inline-block rtl:-scale-x-100">
          ←
        </span>{" "}
        {t("allOrders")}
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="order-heading" className="text-xl font-semibold">
            {t("orderTitle", { number: formatOrderNumber(order.number) })}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("placed", { date: formatDate(order.createdAt, locale) })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} cancelReason={order.cancelReason} />
      </header>

      <div className="flex flex-col gap-3 rounded-xl border p-4">
        {info.step > 0 && <Timeline step={info.step} />}
        <p className="text-sm">{description}</p>
      </div>

      <section aria-labelledby="items-heading" className="flex flex-col gap-3">
        <h3 id="items-heading" className="font-medium">
          {t("items")}
        </h3>
        <ul className="divide-y rounded-xl border">
          {order.items.map((item) => {
            const product = item.variant?.product;
            const canReview = reviewable && product?.status === "ACTIVE";
            const name = (product && names.get(product.id)) ?? item.productName;
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
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </span>
                    <span className="tabular-nums">{money(item.lineTotalCents)}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {variantLabel(item.variantTitle, locale)} ·{" "}
                    {formatNumber(item.quantity, locale)} × {money(item.unitPriceCents)}
                  </span>
                  {canReview && product && (
                    <Link
                      href={`/products/${product.slug}#reviews`}
                      className="self-start text-sm underline underline-offset-4"
                    >
                      {t("writeReview")}
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
            {t("shippingAddress")}
          </h3>
          {shipping ? (
            // US addresses: kept in their own (Latin, left-to-right) order.
            <address className="text-muted-foreground text-sm leading-relaxed not-italic" dir="ltr">
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
            <p className="text-muted-foreground text-sm">{t("notAvailable")}</p>
          )}
        </section>
        <section aria-labelledby="totals-heading" className="flex flex-col gap-2">
          <h3 id="totals-heading" className="font-medium">
            {t("summary")}
          </h3>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
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
      </div>
    </article>
  );
}
