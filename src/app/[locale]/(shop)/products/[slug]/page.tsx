import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { IntentLink } from "@/components/intent-link";
import { ProductView } from "@/components/shop/product/product-view";
import { ReviewsSection } from "@/components/shop/reviews/reviews-section";
import { getActiveProductSlugs, getProductBySlug } from "@/features/catalog/queries";
import { alternatesFor } from "@/features/seo/alternates";
import { breadcrumbJsonLd, productJsonLd, serializeJsonLd } from "@/features/seo/json-ld";
import { baseOpenGraphFor } from "@/features/seo/metadata";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { env } from "@/lib/env";

// SSG/ISR: prerendered at build for every locale, purged by `product:<slug>` /
// `products` tags on admin edits, hourly as a fallback. New products render on first request.
export const revalidate = 3600;
export const dynamicParams = true;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

/** Slugs only; the [locale] layout supplies the locales. */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await getActiveProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = (await params) as { slug: string; locale: Locale };
  const product = await getProductBySlug(slug, locale);
  if (!product) return {};
  const path = `/products/${product.slug}`;
  const title = product.seoTitle ?? product.name;
  return {
    title,
    description: product.seoDescription ?? product.description,
    alternates: alternatesFor(path, locale),
    // og:image comes from the colocated opengraph-image.tsx (photo + name + price card).
    openGraph: {
      ...baseOpenGraphFor(locale),
      url: getPathname({ href: path, locale }),
      title,
      description: product.seoDescription ?? product.description,
    },
    twitter: { card: "summary_large_image", title },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug, locale } = (await params) as { slug: string; locale: Locale };
  setRequestLocale(locale);
  const [t, product] = await Promise.all([
    getTranslations("productPage"),
    getProductBySlug(slug, locale),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label={t("breadcrumb")} className="text-muted-foreground mb-6 text-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-foreground">
              {t("home")}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <IntentLink
              href={`/categories/${product.category.slug}`}
              className="hover:text-foreground"
            >
              {product.category.name}
            </IntentLink>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Static HTML uses the default variant; the URL's ?variant= applies after hydration. */}
      <ProductView product={product} />

      <section className="mt-12 max-w-3xl border-t pt-8" aria-labelledby="about-heading">
        <h2 id="about-heading" className="mb-3 text-lg font-semibold">
          {t("about")}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{product.description}</p>
      </section>

      <ReviewsSection product={product} />

      <script
        type="application/ld+json"
        // Escaped so review/product text can never close the script tag.
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd([
            productJsonLd(product, env.NEXT_PUBLIC_SITE_URL, new Date(), locale),
            breadcrumbJsonLd(product, env.NEXT_PUBLIC_SITE_URL, locale, t("home")),
          ]),
        }}
      />
    </div>
  );
}
