import type { Metadata } from "next";
import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
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
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3";

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function AdminProductsPage({ searchParams }: PageProps) {
  await requireAdminPage("/admin/products");
  const filters = parseAdminProductParams(await searchParams);
  const [{ products, total, page, pageCount }, categories] = await Promise.all([
    listAdminProducts(db, filters),
    listCategoryOptions(db),
  ]);
  const keep = {
    q: filters.q,
    status: filters.status === "CURRENT" ? undefined : filters.status,
    category: filters.category,
    stock: filters.stock,
    sort: filters.sort === "updated" ? undefined : filters.sort,
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Link href="/admin/products/new" className={buttonVariants()}>
          <PlusIcon data-icon="inline-start" />
          New product
        </Link>
      </header>

      {/* A plain GET form: filters live in the URL and survive reloads and sharing. */}
      <Form
        action="/admin/products"
        className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-3"
      >
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Search</span>
          <Input name="q" defaultValue={filters.q} placeholder="Name, slug or SKU" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Status</span>
          <select
            name="status"
            defaultValue={filters.status === "CURRENT" ? "" : filters.status}
            className={selectClass}
          >
            <option value="">Draft + active</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
            <option value="ALL">All</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Category</span>
          <select name="category" defaultValue={filters.category ?? ""} className={selectClass}>
            <option value="">All</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Stock</span>
          <select name="stock" defaultValue={filters.stock ?? ""} className={selectClass}>
            <option value="">Any</option>
            <option value="low">Low (≤ 5)</option>
            <option value="out">Out of stock</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Sort</span>
          <select name="sort" defaultValue={filters.sort} className={selectClass}>
            <option value="updated">Recently updated</option>
            <option value="name">Name</option>
            <option value="stock">Lowest stock</option>
          </select>
        </label>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Apply
        </button>
      </Form>

      <p className="text-muted-foreground text-sm" data-testid="admin-product-count">
        {total} product{total === 1 ? "" : "s"}
      </p>

      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[44rem] text-sm" data-testid="admin-products">
          <thead className="text-muted-foreground border-b text-left">
            <tr>
              <th scope="col" className="w-14 p-3 font-normal">
                <span className="sr-only">Image</span>
              </th>
              <th scope="col" className="p-3 font-normal">
                Product
              </th>
              <th scope="col" className="p-3 font-normal">
                Status
              </th>
              <th scope="col" className="p-3 font-normal">
                Category
              </th>
              <th scope="col" className="p-3 text-right font-normal">
                Price
              </th>
              <th scope="col" className="p-3 text-right font-normal">
                Stock
              </th>
              <th scope="col" className="p-3 font-normal">
                Updated
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
                    /{product.slug} · {product.variantCount} variant
                    {product.variantCount === 1 ? "" : "s"}
                  </div>
                </td>
                <td className="p-3">
                  <ProductStatusBadge status={product.status} />
                </td>
                <td className="p-3">{product.category.name}</td>
                <td className="p-3 text-right tabular-nums">
                  {formatCents(product.minPriceCents)}
                  {product.maxPriceCents !== product.minPriceCents &&
                    `–${formatCents(product.maxPriceCents)}`}
                </td>
                <td
                  className={cn(
                    "p-3 text-right tabular-nums",
                    product.lowStock && "font-medium text-amber-700",
                  )}
                >
                  {product.totalStock}
                </td>
                <td className="text-muted-foreground p-3">
                  {dateFormat.format(product.updatedAt)}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground p-6 text-center">
                  No products match these filters.
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
