import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { ProductGrid } from "@/components/shop/product-grid";
import { getWishlistProducts } from "@/features/wishlist/wishlist";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("wishlist") };
}

export default async function WishlistPage({ params }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t, user] = await Promise.all([
    getTranslations("account"),
    requireUser("/account/wishlist"),
  ]);
  const products = await getWishlistProducts(db, user.id, locale);

  return (
    <section aria-labelledby="wishlist-heading" className="flex flex-col gap-4">
      <h2 id="wishlist-heading" className="text-xl font-semibold">
        {t("wishlist")}
      </h2>
      {products.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p>{t("wishlistEmpty")}</p>
          <Link href="/products" className={buttonVariants({ variant: "outline" })}>
            {t("browseProducts")}
          </Link>
        </div>
      ) : (
        <ProductGrid products={products} className="md:grid-cols-3" />
      )}
    </section>
  );
}
