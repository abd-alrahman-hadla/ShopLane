import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ProductCardData } from "@/features/catalog/types";
import { Price } from "./price";

type ProductCardProps = {
  product: ProductCardData;
  /** Load eagerly for above-the-fold cards. */
  priority?: boolean;
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group focus-visible:ring-ring/50 flex flex-col gap-3 rounded-xl outline-none focus-visible:ring-3"
      data-testid="product-card"
    >
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
        <h3
          className="leading-snug font-medium group-hover:underline group-hover:underline-offset-4"
          data-testid="product-name"
        >
          {product.name}
        </h3>
        <Price
          cents={product.priceFromCents}
          compareAtCents={product.compareAtCents}
          from={product.hasPriceRange}
          className="text-sm"
        />
      </div>
    </Link>
  );
}
