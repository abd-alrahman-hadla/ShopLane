"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { getCartQuote } from "@/features/cart/actions";
import type { CartQuote } from "@/features/cart/quote";
import { useCartStore } from "@/features/cart/store";

/**
 * Prices the persisted cart on the server whenever items or the coupon change.
 * Stale responses are dropped so fast clicking never shows an old total.
 */
export function useCartQuote(enabled: boolean) {
  const items = useCartStore((state) => state.items);
  const couponCode = useCartStore((state) => state.couponCode);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);

  const refresh = useCallback(() => {
    const id = ++requestId.current;
    startTransition(async () => {
      const result = await getCartQuote({ items, couponCode });
      if (id !== requestId.current) return;
      if (result.ok) {
        setQuote(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }, [items, couponCode]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  return { quote, error, isPending, refresh };
}
