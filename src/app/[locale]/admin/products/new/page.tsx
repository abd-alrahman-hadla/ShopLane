import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductForm } from "@/components/admin/product-form/product-form";
import { requireAdminPage } from "@/features/admin/guard";
import { listCategoryOptions } from "@/features/admin/products/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "admin.productPage" });
  return { title: t("newTitle") };
}

export default async function NewProductPage({ params }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t] = await Promise.all([
    getTranslations("admin.productPage"),
    requireAdminPage("/admin/products/new"),
  ]);
  const categories = await listCategoryOptions(db, locale);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/products" className="text-muted-foreground hover:text-foreground text-sm">
        <span aria-hidden className="inline-block rtl:-scale-x-100">
          ←
        </span>{" "}
        {t("back")}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t("newTitle")}</h1>
      <p className="text-muted-foreground text-sm">{t("newLead")}</p>
      <ProductForm product={null} categories={categories} />
    </div>
  );
}
