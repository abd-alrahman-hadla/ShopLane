"use client";

import { useState, useTransition } from "react";
import { LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startCheckout } from "@/features/checkout/actions";
import { useCartStore } from "@/features/cart/store";

type CheckoutButtonProps = {
  disabled: boolean;
  /** Re-price the cart after the server reports a change. */
  onCartChanged: () => void;
};

export function CheckoutButton({ disabled, onCartChanged }: CheckoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(): void {
    setError(null);
    const { items, couponCode } = useCartStore.getState();
    startTransition(async () => {
      // On success the action redirects to Stripe and never returns.
      const result = await startCheckout({ items, couponCode });
      setError(result.message);
      if (result.error === "cart_changed" || result.error === "coupon_rejected") onCartChanged();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        className="h-11 w-full"
        disabled={disabled || isPending}
        onClick={handleClick}
      >
        <LockIcon data-icon="inline-start" />
        {isPending ? "Redirecting to payment…" : "Checkout"}
      </Button>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
