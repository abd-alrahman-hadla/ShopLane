import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProductGrid } from "@/components/shop/product-grid";
import { getCategories, getFeaturedProducts } from "@/features/catalog/queries";
import { cn } from "@/lib/utils";

// Static, purged by catalog tags on admin edits; hourly as a fallback.
export const revalidate = 3600;

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=2000&q=80";

export default async function HomePage() {
  const [featured, categories] = await Promise.all([getFeaturedProducts(8), getCategories()]);

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt="Barista pouring from a gooseneck kettle into glass pour-over brewers"
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/50 to-black/10" />
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-24 text-white sm:px-6 sm:py-32">
          <p className="text-sm tracking-widest text-white/80 uppercase">Roasted every Tuesday</p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Better coffee starts at home.
          </h1>
          <p className="max-w-lg text-lg text-white/85">
            Traceable single origins, everyday blends and the brewing gear we actually use in the
            roastery.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/products"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 bg-white px-5 text-black hover:bg-white/90",
              )}
            >
              Shop all
            </Link>
            <Link
              href="/categories/single-origin"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 border-white/60 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white",
              )}
            >
              Single origins
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="featured-heading">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 id="featured-heading" className="text-2xl font-semibold tracking-tight">
            Featured
          </h2>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm underline-offset-4 hover:underline"
          >
            View all <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        <ProductGrid products={featured} className="md:grid-cols-4" />
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="mb-8 text-2xl font-semibold tracking-tight">
          Shop by category
        </h2>
        <ul
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
          data-testid="category-tiles"
        >
          {categories.map((category) => (
            <li key={category.id}>
              <Link
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
                    {category.productCount} products
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
