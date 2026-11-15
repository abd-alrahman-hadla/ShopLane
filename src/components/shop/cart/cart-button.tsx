"use client";

import { ShoppingBagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { itemCount } from "@/features/cart/cart";
import { useCartDrawer, useCartHydrated, useCartStore } from "@/features/cart/store";

export function CartButton() {
  const hydrated = useCartHydrated();
  const count = useCartStore((state) => itemCount(state.items));
  const setOpen = useCartDrawer((state) => state.setOpen);
  const shown = hydrated ? count : 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={shown > 0 ? `Cart, ${shown} item${shown === 1 ? "" : "s"}` : "Cart"}
      onClick={() => setOpen(true)}
      data-testid="cart-button"
    >
      <ShoppingBagIcon />
      {shown > 0 && (
        <span
          className="bg-primary text-primary-foreground absolute -top-1 -right-1 grid min-w-4.5 place-items-center rounded-full px-1 text-[10px] leading-4.5 font-semibold tabular-nums"
          data-testid="cart-count"
        >
          {shown}
        </span>
      )}
    </Button>
  );
}
