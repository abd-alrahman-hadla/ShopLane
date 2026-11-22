import type { Metadata } from "next";
import Link from "next/link";
import { IntentLink } from "@/components/intent-link";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/shop/product/product-view";
import { ReviewsSection } from "@/components/shop/reviews/reviews-section";
import { getActiveProductSlugs, getProductBySlug } from "@/features/catalog/queries";
import { baseOpenGraph } from "@/features/seo/metadata";
import { breadcrumbJsonLd, productJsonLd, serializeJsonLd } from "@/features/seo/json-ld";
import { env } from "@/lib/env";

// SSG/ISR: prerendered at build, purged by `product:<slug>` / `products` tags
// on admin edits, hourly as a fallback. New products render on first request.
export const revalidate = 3600;
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await getActiveProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.description,
    alternates: { canonical: `/products/${product.slug}` },
    // og:image comes from the colocated opengraph-image.tsx (photo + name + price card).
    openGraph: {
      ...baseOpenGraph,
      url: `/products/${product.slug}`,
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? product.description,
    },
    twitter: { card: "summary_large_image", title: product.seoTitle ?? product.name },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-muted-foreground mb-6 text-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
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
          About this product
        </h2>
        <p className="text-muted-foreground leading-relaxed">{product.description}</p>
      </section>

      <ReviewsSection product={product} />

      <script
        type="application/ld+json"
        // Escaped so review/product text can never close the script tag.
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd([
            productJsonLd(product, env.NEXT_PUBLIC_SITE_URL),
            breadcrumbJsonLd(product, env.NEXT_PUBLIC_SITE_URL),
          ]),
        }}
      />
    </div>
  );
}
