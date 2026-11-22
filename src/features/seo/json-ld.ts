/** Pure schema.org builders for structured data (JSON-LD). */

import type { ProductDetail } from "@/features/catalog/types";

export const SITE_NAME = "ShopLane";
export const SITE_DESCRIPTION =
  "Freshly roasted single-origin coffee, house blends and the brewing gear to make the most of them.";

const IN_STOCK = "https://schema.org/InStock";
const OUT_OF_STOCK = "https://schema.org/OutOfStock";

type JsonLd = Record<string, unknown>;

/** Absolute URL for a path on this site (siteUrl may or may not end with a slash). */
export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`).toString();
}

/** Integer cents → schema.org price string ("18.50"). */
export function centsToPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** One year from `now`, as YYYY-MM-DD (Google wants priceValidUntil on offers). */
function oneYearFrom(now: Date): string {
  const date = new Date(now);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

/** schema.org Product with one Offer per variant and, when reviewed, aggregateRating. */
export function productJsonLd(
  product: ProductDetail,
  siteUrl: string,
  now: Date = new Date(),
): JsonLd {
  const productUrl = absoluteUrl(siteUrl, `/products/${product.slug}`);
  const priceValidUntil = oneYearFrom(now);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: product.description,
    url: productUrl,
    image: product.images.map((image) => image.url),
    sku: product.variants[0]?.sku,
    category: product.category.name,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      sku: variant.sku,
      name: variant.title,
      url: `${productUrl}?variant=${encodeURIComponent(variant.sku)}`,
      price: centsToPrice(variant.priceCents),
      priceCurrency: "USD",
      priceValidUntil,
      availability: variant.stock > 0 ? IN_STOCK : OUT_OF_STOCK,
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    })),
    ...(product.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating.average,
        reviewCount: product.rating.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

/** Home → category → product trail for rich results. */
export function breadcrumbJsonLd(product: ProductDetail, siteUrl: string): JsonLd {
  const trail = [
    { name: "Home", path: "/" },
    { name: product.category.name, path: `/categories/${product.category.slug}` },
    { name: product.name, path: `/products/${product.slug}` },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(siteUrl, crumb.path),
    })),
  };
}

/** Organization + WebSite (with sitelinks search box) for the home page. */
export function siteJsonLd(siteUrl: string): JsonLd[] {
  const home = absoluteUrl(siteUrl, "/");
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: home,
      logo: absoluteUrl(siteUrl, "/logo.svg"),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: home,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl(siteUrl, "/search")}?q={q}` },
        "query-input": "required name=q",
      },
    },
  ];
}

/** Serializes for a <script> tag; escapes `<` so content can never close the tag. */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
