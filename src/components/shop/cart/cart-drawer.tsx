"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCartDrawer } from "@/features/cart/store";
import { CartContents } from "./cart-contents";

export function CartDrawer() {
  const open = useCartDrawer((state) => state.open);
  const setOpen = useCartDrawer((state) => state.setOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
        data-testid="cart-drawer"
      >
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription className="sr-only">Review items and check out.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <CartContents active={open} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
