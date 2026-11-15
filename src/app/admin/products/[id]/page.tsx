import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { AuditHistory } from "@/components/admin/audit-history";
import { ProductForm } from "@/components/admin/product-form/product-form";
import { ProductLifecycle } from "@/components/admin/product-lifecycle";
import { ProductStatusBadge } from "@/components/admin/product-status-badge";
import { requireAdminPage } from "@/features/admin/guard";
import { toEditableProduct } from "@/features/admin/products/editable";
import { getAdminProduct, listCategoryOptions } from "@/features/admin/products/queries";
import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, select: { name: true } });
  return { title: product ? `Edit ${product.name}` : "Product" };
}

export default async function EditProductPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  await requireAdminPage(`/admin/products/${id}`);
  const [product, categories, { created }] = await Promise.all([
    getAdminProduct(db, id),
    listCategoryOptions(db),
    searchParams,
  ]);
  if (!product) notFound();

  const editable = toEditableProduct(product);
  const archived = product.status === "ARCHIVED";

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/products" className="text-muted-foreground hover:text-foreground text-sm">
        ← Products
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <ProductStatusBadge status={product.status} />
        </div>
        <div className="flex items-center gap-3">
          {product.status === "ACTIVE" && (
            <Link
              href={`/products/${product.slug}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
            >
              View in store <ExternalLinkIcon className="size-3.5" aria-hidden />
            </Link>
          )}
          <ProductLifecycle productId={product.id} productName={product.name} archived={archived} />
        </div>
      </header>
      {created && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          Product created as a {product.status === "ACTIVE" ? "live product" : "draft"}.
        </p>
      )}
      {archived ? (
        <p className="bg-muted rounded-lg px-3 py-2 text-sm">
          This product is archived and hidden from the store. Restore it to edit.
        </p>
      ) : (
        <ProductForm key={product.id} product={editable} categories={categories} />
      )}
      <AuditHistory entityType="Product" entityId={product.id} />
    </div>
  );
}
