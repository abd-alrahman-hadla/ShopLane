"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useCartDrawer } from "@/features/cart/store";

const loadCartDrawer = () => import("./cart-drawer");

const CartDrawer = dynamic(() => loadCartDrawer().then((module) => module.CartDrawer), {
  ssr: false,
});

/**
 * The drawer (Radix Dialog + cart contents) isn't needed until someone opens
 * the cart, so it stays out of the initial bundle. The chunk is warmed once the
 * page is idle, so the first open is still instant.
 */
export function LazyCartDrawer() {
  const open = useCartDrawer((state) => state.open);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (open) setOpened(true);
  }, [open]);

  useEffect(() => {
    const warm = () => void loadCartDrawer();
    if (typeof window.requestIdleCallback !== "function") {
      const timer = window.setTimeout(warm, 3000);
      return () => window.clearTimeout(timer);
    }
    const id = window.requestIdleCallback(warm, { timeout: 5000 });
    return () => window.cancelIdleCallback(id);
  }, []);

  return open || opened ? <CartDrawer /> : null;
}
