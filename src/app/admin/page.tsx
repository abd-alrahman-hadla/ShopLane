import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { StatTile } from "@/components/admin/stat-tile";
import { requireAdminPage } from "@/features/admin/guard";
import { getDashboardData } from "@/features/admin/metrics-queries";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { STORE_TIME_ZONE } from "@/lib/store";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdminPage("/admin");
  const { windows, daily, topProducts, lowStock } = await getDashboardData(db);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Net of refunds. Days follow store time ({STORE_TIME_ZONE.replace("_", " ")}).
        </p>
      </header>

      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Revenue today" value={formatCents(windows.today.revenueCents)} />
        <StatTile
          label="Revenue, last 7 days"
          value={formatCents(windows.last7.revenueCents)}
          current={windows.last7.revenueCents}
          previous={windows.last7.previous.revenueCents}
          periodLabel="7 days"
        />
        <StatTile
          label="Revenue, last 30 days"
          value={formatCents(windows.last30.revenueCents)}
          current={windows.last30.revenueCents}
          previous={windows.last30.previous.revenueCents}
          periodLabel="30 days"
        />
        <StatTile
          label="Orders, last 30 days"
          value={windows.last30.orders.toLocaleString("en-US")}
          current={windows.last30.orders}
          previous={windows.last30.previous.orders}
          periodLabel="30 days"
        />
        <StatTile
          label="Average order, 30 days"
          value={formatCents(windows.last30.aovCents)}
          current={windows.last30.aovCents}
          previous={windows.last30.previous.aovCents}
          periodLabel="30 days"
        />
      </section>

      <section aria-labelledby="revenue-heading" className="bg-card rounded-xl border p-4">
        <h2 id="revenue-heading" className="mb-3 font-medium">
          Daily net revenue, last 30 days
        </h2>
        <RevenueChart data={daily} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="top-heading" className="bg-card rounded-xl border p-4">
          <h2 id="top-heading" className="mb-3 font-medium">
            Top products, last 30 days
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sales in the last 30 days.</p>
          ) : (
            <table className="w-full text-sm" data-testid="top-products">
              <thead className="text-muted-foreground text-left">
                <tr>
                  <th scope="col" className="pb-2 font-normal">
                    Product
                  </th>
                  <th scope="col" className="pb-2 text-right font-normal">
                    Units
                  </th>
                  <th scope="col" className="pb-2 text-right font-normal">
                    Revenue
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
                    <td className="py-2 text-right">{product.units}</td>
                    <td className="py-2 text-right">{formatCents(product.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section aria-labelledby="stock-heading" className="bg-card rounded-xl border p-4">
          <h2 id="stock-heading" className="mb-3 flex items-center gap-2 font-medium">
            <AlertTriangleIcon className="size-4 text-amber-600" aria-hidden />
            Low stock
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-muted-foreground text-sm">Every active variant is well stocked.</p>
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
                      {variant.title} · {variant.sku}
                    </span>
                  </Link>
                  <span
                    className={
                      variant.stock === 0
                        ? "shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900"
                        : "shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
                    }
                  >
                    {variant.stock === 0 ? "Out of stock" : `${variant.stock} left`}
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
