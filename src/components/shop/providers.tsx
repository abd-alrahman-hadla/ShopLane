"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { CartDrawer } from "./cart/cart-drawer";
import { CartSessionSync } from "./cart/cart-session-sync";

/**
 * Client-side session and cart. The session is fetched in the browser, so the
 * server-rendered shop pages stay static.
 */
export function ShopProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <CartDrawer />
      <CartSessionSync />
    </SessionProvider>
  );
}
