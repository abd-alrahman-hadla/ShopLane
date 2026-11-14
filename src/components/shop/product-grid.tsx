import type { ProductCardData } from "@/features/catalog/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

type ProductGridProps = {
  products: ProductCardData[];
  /** Number of leading cards to load eagerly. */
  priorityCount?: number;
  className?: string;
};

export function ProductGrid({ products, priorityCount = 0, className }: ProductGridProps) {
  return (
    <ul
      className={cn("grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3", className)}
      data-testid="product-grid"
    >
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
