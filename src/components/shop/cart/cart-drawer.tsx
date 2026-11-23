"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCartDrawer } from "@/features/cart/store";
import { directionOf, type Locale } from "@/i18n/routing";
import { CartContents } from "./cart-contents";

export function CartDrawer() {
  const open = useCartDrawer((state) => state.open);
  const setOpen = useCartDrawer((state) => state.setOpen);
  const t = useTranslations("cart");
  // Opens from the end edge: right in English, left in Arabic.
  const side = directionOf(useLocale() as Locale) === "rtl" ? "left" : "right";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side={side}
        className="w-full overflow-y-auto sm:max-w-md"
        data-testid="cart-drawer"
      >
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription className="sr-only">{t("description")}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <CartContents active={open} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
