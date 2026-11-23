import type { Metadata } from "next";
import { AlertTriangleIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { StatTile } from "@/components/admin/stat-tile";
import { variantLabel } from "@/features/catalog/variant-labels";
import { requireAdminPage } from "@/features/admin/guard";
import { getDashboardData } from "@/features/admin/metrics-queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/format";
import { STORE_TIME_ZONE } from "@/lib/store";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "admin.dashboard" });
  return { title: t("title") };
}

export default async function AdminDashboardPage({ params }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t] = await Promise.all([getTranslations("admin.dashboard"), requireAdminPage("/admin")]);
  const { windows, daily, topProducts, lowStock } = await getDashboardData(db, new Date(), locale);
  const money = (cents: number) => formatMoney(cents, locale);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("lead", { timeZone: STORE_TIME_ZONE.replace("_", " ") })}
        </p>
      </header>

      <section aria-label={t("keyFigures")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label={t("revenueToday")} value={money(windows.today.revenueCents)} />
        <StatTile
          label={t("revenue7")}
          value={money(windows.last7.revenueCents)}
          current={windows.last7.revenueCents}
          previous={windows.last7.previous.revenueCents}
          periodLabel={t("days", { count: 7 })}
        />
        <StatTile
          label={t("revenue30")}
          value={money(windows.last30.revenueCents)}
          current={windows.last30.revenueCents}
          previous={windows.last30.previous.revenueCents}
          periodLabel={t("days", { count: 30 })}
        />
        <StatTile
          label={t("orders30")}
          value={formatNumber(windows.last30.orders, locale)}
          current={windows.last30.orders}
          previous={windows.last30.previous.orders}
          periodLabel={t("days", { count: 30 })}
        />
        <StatTile
          label={t("aov30")}
          value={money(windows.last30.aovCents)}
          current={windows.last30.aovCents}
          previous={windows.last30.previous.aovCents}
          periodLabel={t("days", { count: 30 })}
        />
      </section>

      <section aria-labelledby="revenue-heading" className="bg-card rounded-xl border p-4">
        <h2 id="revenue-heading" className="mb-3 font-medium">
          {t("dailyRevenue")}
        </h2>
        <RevenueChart data={daily} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="top-heading" className="bg-card rounded-xl border p-4">
          <h2 id="top-heading" className="mb-3 font-medium">
            {t("topProducts")}
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noSales")}</p>
          ) : (
            <table className="w-full text-sm" data-testid="top-products">
              <thead className="text-muted-foreground text-start">
                <tr>
                  <th scope="col" className="pb-2 text-start font-normal">
                    {t("product")}
                  </th>
                  <th scope="col" className="pb-2 text-end font-normal">
                    {t("units")}
                  </th>
                  <th scope="col" className="pb-2 text-end font-normal">
                    {t("revenue")}
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {topProducts.map((product) => (
                  <tr key={product.key} className="border-t">
                    <td className="py-2">
                      {product.productId ? (
                        <Link
                          href={`/admin/products/${product.productId}`}
                          className="hover:underline"
                        >
                          {product.name}
                        </Link>
                      ) : (
                        product.name
                      )}
                    </td>
                    <td className="py-2 text-end">{formatNumber(product.units, locale)}</td>
                    <td className="py-2 text-end">{money(product.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section aria-labelledby="stock-heading" className="bg-card rounded-xl border p-4">
          <h2 id="stock-heading" className="mb-3 flex items-center gap-2 font-medium">
            <AlertTriangleIcon className="text-warning size-4" aria-hidden />
            {t("lowStock")}
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("wellStocked")}</p>
          ) : (
            <ul className="divide-y text-sm" data-testid="low-stock">
              {lowStock.map((variant) => (
                <li key={variant.id} className="flex items-center justify-between gap-3 py-2">
                  <Link
                    href={`/admin/products/${variant.productId}`}
                    className="min-w-0 hover:underline"
                  >
                    <span className="block truncate">{variant.productName}</span>
                    <span className="text-muted-foreground text-xs">
                      {variantLabel(variant.title, locale)} · <span dir="ltr">{variant.sku}</span>
                    </span>
                  </Link>
                  <span
                    className={
                      variant.stock === 0
                        ? "bg-danger-soft text-danger-strong shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                        : "bg-warning-soft text-warning-strong shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                    }
                  >
                    {variant.stock === 0 ? t("outOfStock") : t("left", { count: variant.stock })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
