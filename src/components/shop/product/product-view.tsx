"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY_PER_LINE } from "@/features/cart/cart";
import { useCartDrawer, useCartStore } from "@/features/cart/store";
import type { ProductDetail, VariantOption } from "@/features/catalog/types";
import { imageIndexForVariant, resolveInitialVariant } from "@/features/catalog/variants";
import { Price } from "../price";
import { RatingSummary } from "../reviews/stars";
import { WishlistButton } from "../wishlist/wishlist-button";
import { ImageGallery } from "./image-gallery";
import { VariantPicker } from "./variant-picker";

const LOW_STOCK_THRESHOLD = 5;

type ProductViewProps = {
  product: ProductDetail;
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
 * Gallery + purchase panel. Rendered statically with the default variant; the
 * URL's ?variant= is applied after hydration. Reading it during render would
 * need useSearchParams + Suspense, which swaps the static tree on hydration and
 * repaints the gallery photo (the LCP element) after JS runs.
 */
export function ProductView({ product }: ProductViewProps) {
  const [selected, setSelected] = useState<VariantOption | undefined>(() =>
    resolveInitialVariant(product.variants, null),
  );
  const [imageIndex, setImageIndex] = useState(() =>
    selected ? (imageIndexForVariant(product.images, selected.id) ?? 0) : 0,
  );
  const addToCart = useCartStore((state) => state.add);
  const openCart = useCartDrawer((state) => state.setOpen);

  function showVariant(variant: VariantOption): void {
    setSelected(variant);
    const variantImage = imageIndexForVariant(product.images, variant.id);
    if (variantImage !== undefined) setImageIndex(variantImage);
  }

  function handleSelect(variant: VariantOption): void {
    showVariant(variant);
    syncVariantToUrl(variant.sku);
  }

  // Once, after hydration: a shared link like ?variant=ETH-1KG preselects that variant.
  useEffect(() => {
    const sku = new URLSearchParams(window.location.search).get("variant");
    const fromUrl = sku ? product.variants.find((variant) => variant.sku === sku) : undefined;
    if (fromUrl) showVariant(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only; later changes come from clicks
  }, []);

  function handleAddToCart(): void {
    if (!selected || selected.stock <= 0) return;
    addToCart(selected.id, 1, Math.min(selected.stock, MAX_QUANTITY_PER_LINE));
    openCart(true);
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
          {product.rating && (
            <a href="#reviews" className="self-start hover:underline">
              <RatingSummary rating={product.rating} className="text-sm" />
            </a>
          )}
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
        <div className="flex flex-wrap gap-2">
          {/* Stock here may be slightly stale (static page); the cart re-checks on the server. */}
          <Button
            size="lg"
            className="h-11 w-full sm:w-72"
            disabled={!selected || selected.stock <= 0}
            onClick={handleAddToCart}
          >
            {selected && selected.stock > 0 ? "Add to cart" : "Sold out"}
          </Button>
          <WishlistButton productId={product.id} productName={product.name} variant="labelled" />
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
