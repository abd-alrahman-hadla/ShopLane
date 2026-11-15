import type { Metadata } from "next";
import { Suspense } from "react";
import { CartContents } from "@/components/shop/cart/cart-contents";
import { CheckoutCancelledNotice } from "@/components/shop/cart/checkout-cancelled-notice";

export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
      <Suspense fallback={null}>
        <CheckoutCancelledNotice />
      </Suspense>
      <CartContents />
    </div>
  );
}
