import type { Metadata } from "next";
import Form from "next/form";
import Image from "next/image";
import { PlusIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListPagination } from "@/components/admin/list-pagination";
import { ProductStatusBadge } from "@/components/admin/product-status-badge";
import { requireAdminPage } from "@/features/admin/guard";
import {
  listAdminProducts,
  listCategoryOptions,
  parseAdminProductParams,
} from "@/features/admin/products/queries";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { LOW_STOCK_THRESHOLD } from "@/lib/store";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "admin.products" });
  return { title: t("title") };
}

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3";

export default async function AdminProductsPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t] = await Promise.all([
    getTranslations("admin.products"),
    requireAdminPage("/admin/products"),
  ]);
  const filters = parseAdminProductParams(await searchParams);
  const [{ products, total, page, pageCount }, categories] = await Promise.all([
    listAdminProducts(db, filters, locale),
    listCategoryOptions(db, locale),
  ]);
  const keep = {
    q: filters.q,
    status: filters.status === "CURRENT" ? undefined : filters.status,
    category: filters.category,
    stock: filters.stock,
    sort: filters.sort === "updated" ? undefined : filters.sort,
  };
  const money = (cents: number) => formatMoney(cents, locale);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Link href="/admin/products/new" className={buttonVariants()}>
          <PlusIcon data-icon="inline-start" />
          {t("new")}
        </Link>
      </header>

      {/* A plain GET form: filters live in the URL and survive reloads and sharing. */}
      <Form
        action={getPathname({ href: "/admin/products", locale })}
        className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-3"
      >
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{t("search")}</span>
          <Input name="q" defaultValue={filters.q} placeholder={t("searchPlaceholder")} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{t("status")}</span>
          <select
            name="status"
            defaultValue={filters.status === "CURRENT" ? "" : filters.status}
            className={selectClass}
          >
            <option value="">{t("statusCurrent")}</option>
            <option value="ACTIVE">{t("statusLabel.ACTIVE")}</option>
            <option value="DRAFT">{t("statusLabel.DRAFT")}</option>
            <option value="ARCHIVED">{t("statusLabel.ARCHIVED")}</option>
            <option value="ALL">{t("all")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{t("category")}</span>
          <select name="category" defaultValue={filters.category ?? ""} className={selectClass}>
            <option value="">{t("all")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{t("stock")}</span>
          <select name="stock" defaultValue={filters.stock ?? ""} className={selectClass}>
            <option value="">{t("any")}</option>
            <option value="low">{t("stockLow", { max: LOW_STOCK_THRESHOLD })}</option>
            <option value="out">{t("stockOut")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{t("sort")}</span>
          <select name="sort" defaultValue={filters.sort} className={selectClass}>
            <option value="updated">{t("sortUpdated")}</option>
            <option value="name">{t("sortName")}</option>
            <option value="stock">{t("sortStock")}</option>
          </select>
        </label>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          {t("apply")}
        </button>
      </Form>

      <p className="text-muted-foreground text-sm" data-testid="admin-product-count">
        {t("count", { count: total })}
      </p>

      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[44rem] text-sm" data-testid="admin-products">
          <thead className="text-muted-foreground border-b text-start">
            <tr>
              <th scope="col" className="w-14 p-3 font-normal">
                <span className="sr-only">{t("image")}</span>
              </th>
              <th scope="col" className="p-3 text-start font-normal">
                {t("product")}
              </th>
              <th scope="col" className="p-3 text-start font-normal">
                {t("status")}
              </th>
              <th scope="col" className="p-3 text-start font-normal">
                {t("category")}
              </th>
              <th scope="col" className="p-3 text-end font-normal">
                {t("price")}
              </th>
              <th scope="col" className="p-3 text-end font-normal">
                {t("stock")}
              </th>
              <th scope="col" className="p-3 text-start font-normal">
                {t("updated")}
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-muted/40 border-t">
                <td className="p-3">
                  <div className="bg-muted relative size-10 overflow-hidden rounded-md">
                    {product.image && (
                      <Image
                        src={product.image.url}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="font-medium hover:underline"
                  >
                    {product.name}
                  </Link>
                  <div className="text-muted-foreground text-xs">
                    <span dir="ltr">/{product.slug}</span> ·{" "}
                    {t("variantCount", { count: product.variantCount })}
                  </div>
                </td>
                <td className="p-3">
                  <ProductStatusBadge status={product.status} />
                </td>
                <td className="p-3">{product.category.name}</td>
                <td className="p-3 text-end tabular-nums">
                  {money(product.minPriceCents)}
                  {product.maxPriceCents !== product.minPriceCents &&
                    `–${money(product.maxPriceCents)}`}
                </td>
                <td
                  className={cn(
                    "p-3 text-end tabular-nums",
                    product.lowStock && "text-warning font-medium",
                  )}
                >
                  {formatNumber(product.totalStock, locale)}
                </td>
                <td className="text-muted-foreground p-3">
                  {formatDate(product.updatedAt, locale)}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground p-6 text-center">
                  {t("noMatches")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ListPagination basePath="/admin/products" params={keep} page={page} pageCount={pageCount} />
    </div>
  );
}
