"use client";

import { useSearchParams } from "next/navigation";

export function CheckoutCancelledNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("checkout") !== "cancelled") return null;
  return (
    <p className="bg-secondary rounded-lg px-4 py-3 text-sm" role="status">
      Checkout was cancelled and you haven’t been charged. Your cart is saved below.
    </p>
  );
}
