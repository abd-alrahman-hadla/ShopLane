import type { Metadata } from "next";
import Form from "next/form";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "admin.orders" });
  return { title: t("title") };
}

export default async function AdminOrdersPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t] = await Promise.all([
    getTranslations("admin.orders"),
    requireAdminPage("/admin/orders"),
  ]);
  const filters = parseAdminOrderParams(await searchParams);
  const { orders, total, page, pageCount } = await listAdminOrders(db, filters);
  const tabHref = (tab: OrderTab) => {
    const query = new URLSearchParams();
    if (tab !== "ALL") query.set("status", tab);
    if (filters.q) query.set("q", filters.q);
    const search = query.toString();
    return search ? `/admin/orders?${search}` : "/admin/orders";
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <nav aria-label={t("statusNav")} className="flex gap-1 overflow-x-auto border-b">
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
            {t(`tabs.${tab}`)}
          </Link>
        ))}
      </nav>

      <Form
        action={getPathname({ href: "/admin/orders", locale })}
        className="flex flex-wrap gap-2"
      >
        {filters.status !== "ALL" && <input type="hidden" name="status" value={filters.status} />}
        <Input
          name="q"
          defaultValue={filters.q}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="max-w-xs"
        />
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          {t("search")}
        </button>
      </Form>

      <p className="text-muted-foreground text-sm">{t("count", { count: total })}</p>
      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[40rem] text-sm" data-testid="admin-orders">
          <thead className="text-muted-foreground border-b text-start">
            <tr>
              <th scope="col" className="p-3 text-start font-normal">
                {t("order")}
              </th>
              <th scope="col" className="p-3 text-start font-normal">
                {t("placed")}
              </th>
              <th scope="col" className="p-3 text-start font-normal">
                {t("customer")}
              </th>
              <th scope="col" className="p-3 text-start font-normal">
                {t("status")}
              </th>
              <th scope="col" className="p-3 text-end font-normal">
                {t("items")}
              </th>
              <th scope="col" className="p-3 text-end font-normal">
                {t("total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/40 border-t">
                <td className="p-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium hover:underline"
                    dir="ltr"
                  >
                    {formatOrderNumber(order.number)}
                  </Link>
                </td>
                <td className="text-muted-foreground p-3">
                  {formatDate(order.createdAt, locale, "dateTime")}
                </td>
                <td className="p-3">
                  {order.email ? (
                    <span dir="ltr">{order.email}</span>
                  ) : (
                    <span className="text-muted-foreground">{t("guestPending")}</span>
                  )}
                </td>
                <td className="p-3">
                  <OrderStatusBadge status={order.status} cancelReason={order.cancelReason} />
                  {order.refundedCents > 0 && order.status !== "REFUNDED" && (
                    <span className="text-muted-foreground ms-2 text-xs">
                      {t("partlyRefunded")}
                    </span>
                  )}
                </td>
                <td className="p-3 text-end tabular-nums">
                  {formatNumber(order.itemCount, locale)}
                </td>
                <td className="p-3 text-end tabular-nums">
                  {formatMoney(order.totalCents, locale, order.currency)}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground p-6 text-center">
                  {t("none")}
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
