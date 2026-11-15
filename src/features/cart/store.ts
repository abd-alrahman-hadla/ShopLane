"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addItem, removeItem, setQuantity, type CartItem } from "./cart";

type CartState = {
  items: CartItem[];
  couponCode: string | null;
  /** User whose server cart this browser cart was last merged into. */
  mergedForUserId: string | null;
  add: (variantId: string, quantity?: number, maxQuantity?: number) => void;
  setQuantity: (variantId: string, quantity: number, maxQuantity?: number) => void;
  remove: (variantId: string) => void;
  replaceItems: (items: CartItem[]) => void;
  setCouponCode: (code: string | null) => void;
  setMergedForUserId: (userId: string | null) => void;
  clear: () => void;
};

/** Guest cart, persisted to localStorage. Holds IDs and quantities only. */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      mergedForUserId: null,
      add: (variantId, quantity = 1, maxQuantity) =>
        set((state) => ({ items: addItem(state.items, variantId, quantity, maxQuantity) })),
      setQuantity: (variantId, quantity, maxQuantity) =>
        set((state) => ({ items: setQuantity(state.items, variantId, quantity, maxQuantity) })),
      remove: (variantId) => set((state) => ({ items: removeItem(state.items, variantId) })),
      replaceItems: (items) => set({ items }),
      setCouponCode: (couponCode) => set({ couponCode }),
      setMergedForUserId: (mergedForUserId) => set({ mergedForUserId }),
      clear: () => set({ items: [], couponCode: null }),
    }),
    {
      name: "shoplane-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ items, couponCode, mergedForUserId }) => ({
        items,
        couponCode,
        mergedForUserId,
      }),
    },
  ),
);

/** True once the persisted cart has loaded, so SSR markup and the client agree. */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useCartStore.persist.onFinishHydration(onChange),
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );
}

type CartDrawerState = { open: boolean; setOpen: (open: boolean) => void };

/** Drawer visibility; not persisted. */
export const useCartDrawer = create<CartDrawerState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
