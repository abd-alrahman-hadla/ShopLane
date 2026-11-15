import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ProductCardData } from "@/features/catalog/types";
import { Price } from "./price";
import { RatingSummary } from "./reviews/stars";
import { WishlistButton } from "./wishlist/wishlist-button";

type ProductCardProps = {
  product: ProductCardData;
  /** Load eagerly for above-the-fold cards. */
  priority?: boolean;
};

/**
 * The product name is a "stretched" link covering the whole card, so the
 * wishlist heart can be a separate button (no button nested inside a link).
 */
export function ProductCard({ product, priority = false }: ProductCardProps) {
  return (
    <div className="group relative flex flex-col gap-3" data-testid="product-card">
      <div className="bg-muted relative aspect-square overflow-hidden rounded-xl">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {!product.inStock && <Badge variant="secondary">Sold out</Badge>}
          {product.inStock && product.compareAtCents !== null && (
            <Badge className="bg-red-700 text-white">Sale</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <span className="text-muted-foreground text-xs tracking-wide uppercase">
          {product.categoryName}
        </span>
        <h3 className="leading-snug font-medium" data-testid="product-name">
          <Link
            href={`/products/${product.slug}`}
            className="focus-visible:ring-ring/50 rounded-sm outline-none group-hover:underline group-hover:underline-offset-4 after:absolute after:inset-0 after:rounded-xl focus-visible:ring-3"
          >
            {product.name}
          </Link>
        </h3>
        <Price
          cents={product.priceFromCents}
          compareAtCents={product.compareAtCents}
          from={product.hasPriceRange}
          className="text-sm"
        />
        <RatingSummary rating={product.rating} />
      </div>
      <WishlistButton
        productId={product.id}
        productName={product.name}
        className="absolute top-2 right-2 z-10"
      />
    </div>
  );
}
