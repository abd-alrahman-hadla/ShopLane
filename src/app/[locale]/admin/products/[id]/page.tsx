import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuditHistory } from "@/components/admin/audit-history";
import { ProductForm } from "@/components/admin/product-form/product-form";
import { ProductLifecycle } from "@/components/admin/product-lifecycle";
import { ProductStatusBadge } from "@/components/admin/product-status-badge";
import { requireAdminPage } from "@/features/admin/guard";
import { toEditableProduct } from "@/features/admin/products/editable";
import { getAdminProduct, listCategoryOptions } from "@/features/admin/products/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ created?: string }>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { id, locale } = (await params) as { id: string; locale: Locale };
  const t = await getTranslations({ locale, namespace: "admin.productPage" });
  const product = await db.product.findUnique({ where: { id }, select: { name: true } });
  return { title: product ? t("editTitle", { name: product.name }) : t("fallbackTitle") };
}

export default async function EditProductPage({ params, searchParams }: PageProps) {
  const { id, locale } = (await params) as { id: string; locale: Locale };
  setRequestLocale(locale);
  const [t] = await Promise.all([
    getTranslations("admin.productPage"),
    requireAdminPage(`/admin/products/${id}`),
  ]);
  const [product, categories, { created }] = await Promise.all([
    getAdminProduct(db, id),
    listCategoryOptions(db, locale),
    searchParams,
  ]);
  if (!product) notFound();

  const editable = toEditableProduct(product);
  const archived = product.status === "ARCHIVED";
  // The heading follows the admin's language; the form edits both languages.
  const displayName = (locale === "ar" && product.translations[0]?.name) || product.name;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/products" className="text-muted-foreground hover:text-foreground text-sm">
        <span aria-hidden className="inline-block rtl:-scale-x-100">
          ←
        </span>{" "}
        {t("back")}
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          <ProductStatusBadge status={product.status} />
        </div>
        <div className="flex items-center gap-3">
          {product.status === "ACTIVE" && (
            <Link
              href={`/products/${product.slug}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
            >
              {t("viewInStore")}{" "}
              <ExternalLinkIcon className="size-3.5 rtl:-scale-x-100" aria-hidden />
            </Link>
          )}
          <ProductLifecycle productId={product.id} productName={displayName} archived={archived} />
        </div>
      </header>
      {created && (
        <p
          className="bg-success-soft text-success-strong rounded-lg px-3 py-2 text-sm"
          role="status"
        >
          {product.status === "ACTIVE" ? t("createdLive") : t("createdDraft")}
        </p>
      )}
      {archived ? (
        <p className="bg-muted rounded-lg px-3 py-2 text-sm">{t("archivedNotice")}</p>
      ) : (
        <ProductForm key={product.id} product={editable} categories={categories} />
      )}
      <AuditHistory entityType="Product" entityId={product.id} />
    </div>
  );
}
