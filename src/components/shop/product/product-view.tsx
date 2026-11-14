"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProductDetail, VariantOption } from "@/features/catalog/types";
import { imageIndexForVariant, resolveInitialVariant } from "@/features/catalog/variants";
import { Price } from "../price";
import { ImageGallery } from "./image-gallery";
import { VariantPicker } from "./variant-picker";

const LOW_STOCK_THRESHOLD = 5;

type ProductViewProps = {
  product: ProductDetail;
  initialSku?: string | null;
};

function StockStatus({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge variant="secondary">Sold out</Badge>;
  if (stock <= LOW_STOCK_THRESHOLD)
    return <span className="text-sm text-amber-700">Only {stock} left</span>;
  return <span className="text-sm text-emerald-700">In stock</span>;
}

/** Writes ?variant=<sku> without a server round trip, so the page stays static. */
function syncVariantToUrl(sku: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("variant", sku);
  window.history.replaceState(null, "", url);
}

/**
 * Gallery + purchase panel. Rendered statically with the default variant and
 * hydrated with the variant from the URL (see ProductViewFromUrl).
 */
export function ProductView({ product, initialSku }: ProductViewProps) {
  const [selected, setSelected] = useState<VariantOption | undefined>(() =>
    resolveInitialVariant(product.variants, initialSku),
  );
  const [imageIndex, setImageIndex] = useState(() =>
    selected ? (imageIndexForVariant(product.images, selected.id) ?? 0) : 0,
  );

  function handleSelect(variant: VariantOption): void {
    setSelected(variant);
    const variantImage = imageIndexForVariant(product.images, variant.id);
    if (variantImage !== undefined) setImageIndex(variantImage);
    syncVariantToUrl(variant.sku);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
      <ImageGallery
        images={product.images}
        activeIndex={imageIndex}
        onSelect={setImageIndex}
        productName={product.name}
      />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          {selected && (
            <div className="flex flex-wrap items-center gap-3">
              <Price
                cents={selected.priceCents}
                compareAtCents={selected.compareAtPriceCents}
                className="text-xl"
              />
              <StockStatus stock={selected.stock} />
            </div>
          )}
        </div>
        {selected && (
          <VariantPicker variants={product.variants} selected={selected} onSelect={handleSelect} />
        )}
        <div className="flex flex-col gap-2">
          {/* Cart arrives in Phase 4; the button is wired up there. */}
          <Button size="lg" className="h-11 w-full sm:w-72" disabled>
            {selected && selected.stock > 0 ? "Add to cart" : "Sold out"}
          </Button>
          {selected && selected.stock > 0 && (
            <p className="text-muted-foreground text-xs">Online checkout is coming soon.</p>
          )}
        </div>
        {selected && (
          <p className="text-muted-foreground text-xs" data-testid="selected-sku">
            SKU {selected.sku}
          </p>
        )}
      </div>
    </div>
  );
}

/** Reads ?variant=. Must sit inside <Suspense> so the page can be prerendered. */
export function ProductViewFromUrl({ product }: { product: ProductDetail }) {
  const searchParams = useSearchParams();
  return <ProductView product={product} initialSku={searchParams.get("variant")} />;
}
