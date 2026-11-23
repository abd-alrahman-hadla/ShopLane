import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/shop/account/order-status-badge";
import { listCustomerOrders } from "@/features/account/orders";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("orders") };
}

export default async function OrdersPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t, user] = await Promise.all([getTranslations("account"), requireUser("/account/orders")]);
  const requested = Number((await searchParams).page ?? "1");
  const { orders, page, pageCount, total } = await listCustomerOrders(
    db,
    user,
    Number.isInteger(requested) ? requested : 1,
  );

  return (
    <section aria-labelledby="orders-heading" className="flex flex-col gap-4">
      <h2 id="orders-heading" className="text-xl font-semibold">
        {t("orders")}
      </h2>
      {total === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p>{t("noOrders")}</p>
          <Link href="/products" className={buttonVariants({ variant: "outline" })}>
            {t("startShopping")}
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
                  <span className="font-medium" dir="ltr">
                    {formatOrderNumber(order.number)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {formatDate(order.createdAt, locale)} ·{" "}
                    {t("itemCount", { count: order.itemCount })}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={order.status} cancelReason={order.cancelReason} />
                  <span className="font-medium tabular-nums">
                    {formatMoney(order.totalCents, locale, order.currency)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pageCount > 1 && (
        <nav aria-label={t("orderPages")} className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/account/orders?page=${page - 1}`}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("newer")}
            </Link>
          )}
          {page < pageCount && (
            <Link
              href={`/account/orders?page=${page + 1}`}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("older")}
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
