import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ProductGrid } from "@/components/shop/product-grid";
import { getWishlistProducts } from "@/features/wishlist/wishlist";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const products = await getWishlistProducts(db, user.id);

  return (
    <section aria-labelledby="wishlist-heading" className="flex flex-col gap-4">
      <h2 id="wishlist-heading" className="text-xl font-semibold">
        Wishlist
      </h2>
      {products.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p>Tap the heart on any product to save it here.</p>
          <Link href="/products" className={buttonVariants({ variant: "outline" })}>
            Browse products
          </Link>
        </div>
      ) : (
        <ProductGrid products={products} className="md:grid-cols-3" />
      )}
    </section>
  );
}
