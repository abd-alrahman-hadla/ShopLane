"use client";

import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { useCartStore } from "@/features/cart/store";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15;

/** The order exists, so the purchase is no longer in the browser cart. */
export function ClearCartOnMount() {
  useEffect(() => {
    useCartStore.getState().clear();
  }, []);
  return null;
}

/** Re-renders the page until the webhook marks the order paid (up to ~30 s). */
export function PaymentPoller() {
  const router = useRouter();
  useEffect(() => {
    let polls = 0;
    const timer = setInterval(() => {
      polls += 1;
      router.refresh();
      if (polls >= MAX_POLLS) clearInterval(timer);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
