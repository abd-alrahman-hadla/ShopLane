import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRightIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { IntentLink } from "@/components/intent-link";
import { buttonVariants } from "@/components/ui/button";
import { ProductGrid } from "@/components/shop/product-grid";
import { getCategories, getFeaturedProducts } from "@/features/catalog/queries";
import { alternatesFor } from "@/features/seo/alternates";
import { serializeJsonLd, siteJsonLd } from "@/features/seo/json-ld";
import type { Locale } from "@/i18n/routing";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

// Static, purged by catalog tags on admin edits; hourly as a fallback.
export const revalidate = 3600;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    // Absolute so the home page isn't "Something · ShopLane".
    title: { absolute: t("defaultTitle") },
    alternates: alternatesFor("/", locale),
  };
}

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=2000&q=80";

export default async function HomePage({ params }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t, featured, categories] = await Promise.all([
    getTranslations("home"),
    getFeaturedProducts(8, locale),
    getCategories(locale),
  ]);

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt={t("heroAlt")}
          fill
          priority
          fetchPriority="high"
          quality={60}
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/50 to-black/10 rtl:bg-gradient-to-l" />
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-24 text-white sm:px-6 sm:py-32">
          <p className="text-sm tracking-widest text-white/80 uppercase">{t("eyebrow")}</p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="max-w-lg text-lg text-white/85">{t("lead")}</p>
          <div className="flex flex-wrap gap-3">
            <IntentLink
              href="/products"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 bg-white px-5 text-black hover:bg-white/90",
              )}
            >
              {t("shopAll")}
            </IntentLink>
            <IntentLink
              href="/categories/single-origin"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 border-white/60 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white",
              )}
            >
              {t("singleOrigins")}
            </IntentLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="featured-heading">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 id="featured-heading" className="text-2xl font-semibold tracking-tight">
            {t("featured")}
          </h2>
          <IntentLink
            href="/products"
            className="flex items-center gap-1 text-sm underline-offset-4 hover:underline"
          >
            {t("viewAll")} <ArrowRightIcon className="size-4 rtl:-scale-x-100" aria-hidden />
          </IntentLink>
        </div>
        <ProductGrid products={featured} className="md:grid-cols-4" />
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="mb-8 text-2xl font-semibold tracking-tight">
          {t("byCategory")}
        </h2>
        <ul
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
          data-testid="category-tiles"
        >
          {categories.map((category) => (
            <li key={category.id}>
              <IntentLink
                href={`/categories/${category.slug}`}
                className="group bg-muted relative flex aspect-[4/5] items-end overflow-hidden rounded-xl"
              >
                {category.imageUrl && (
                  <Image
                    src={category.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="relative p-4 text-white">
                  <span className="font-medium">{category.name}</span>
                  <span className="block text-xs text-white/75">
                    {t("productCount", { count: category.productCount })}
                  </span>
                </div>
              </IntentLink>
            </li>
          ))}
        </ul>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(siteJsonLd(env.NEXT_PUBLIC_SITE_URL, locale)),
        }}
      />
    </>
  );
}
