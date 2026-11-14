import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductView, ProductViewFromUrl } from "@/components/shop/product/product-view";
import { getActiveProductSlugs, getProductBySlug } from "@/features/catalog/queries";

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
  const image = product.images[0];
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: image ? { images: [{ url: image.url, alt: image.alt }] } : undefined,
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
            <Link href={`/categories/${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Static HTML uses the default variant; the URL's ?variant= applies on hydration. */}
      <Suspense fallback={<ProductView product={product} />}>
        <ProductViewFromUrl product={product} />
      </Suspense>

      <section className="mt-12 max-w-3xl border-t pt-8" aria-labelledby="about-heading">
        <h2 id="about-heading" className="mb-3 text-lg font-semibold">
          About this product
        </h2>
        <p className="text-muted-foreground leading-relaxed">{product.description}</p>
      </section>
    </div>
  );
}
