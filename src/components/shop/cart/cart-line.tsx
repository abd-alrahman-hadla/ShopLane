"use client";

import Image from "next/image";
import Link from "next/link";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY_PER_LINE } from "@/features/cart/cart";
import type { CartQuoteLine } from "@/features/cart/quote";
import { useCartStore } from "@/features/cart/store";
import { formatCents } from "@/lib/money";

export function CartLine({ line }: { line: CartQuoteLine }) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const { variant } = line;

  if (!variant) {
    return (
      <li className="flex items-center justify-between gap-3 py-4" data-testid="cart-line">
        <p className="text-muted-foreground text-sm">This item is no longer available.</p>
        <Button variant="ghost" size="sm" onClick={() => remove(line.variantId)}>
          Remove
        </Button>
      </li>
    );
  }

  const max = Math.min(variant.stock, MAX_QUANTITY_PER_LINE);
  const name = `${variant.product.name}, ${variant.title}`;

  return (
    <li className="flex gap-3 py-4" data-testid="cart-line">
      <Link
        href={`/products/${variant.product.slug}`}
        className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg"
      >
        {variant.imageUrl && (
          <Image
            src={variant.imageUrl}
            alt={variant.imageAlt ?? ""}
            fill
            sizes="80px"
            className="object-cover"
          />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/products/${variant.product.slug}`}
              className="line-clamp-2 text-sm font-medium hover:underline"
            >
              {variant.product.name}
            </Link>
            <p className="text-muted-foreground text-xs">{variant.title}</p>
          </div>
          <p className="text-sm font-medium tabular-nums" data-testid="cart-line-total">
            {formatCents(variant.priceCents * line.quantity)}
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div
            className="flex items-center rounded-lg border"
            role="group"
            aria-label={`Quantity for ${name}`}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Decrease quantity of ${name}`}
              onClick={() => setQuantity(line.variantId, line.quantity - 1)}
            >
              <MinusIcon />
            </Button>
            <span className="w-8 text-center text-sm tabular-nums" data-testid="cart-line-quantity">
              {line.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Increase quantity of ${name}`}
              disabled={line.quantity >= max}
              onClick={() => setQuantity(line.variantId, line.quantity + 1, max)}
            >
              <PlusIcon />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${name}`}
            onClick={() => remove(line.variantId)}
          >
            <Trash2Icon />
          </Button>
        </div>
        {line.status === "insufficient" && (
          <p className="text-sm text-amber-700" role="status">
            {variant.stock === 0 ? "Sold out. " : `Only ${variant.stock} left. `}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => setQuantity(line.variantId, variant.stock, variant.stock)}
            >
              {variant.stock === 0 ? "Remove" : `Update to ${variant.stock}`}
            </button>
          </p>
        )}
      </div>
    </li>
  );
}
