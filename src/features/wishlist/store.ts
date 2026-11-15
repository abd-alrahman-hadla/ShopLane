"use client";

import { create } from "zustand";

type WishlistState = {
  /** The signed-in user's wishlisted product IDs; empty when signed out. */
  ids: ReadonlySet<string>;
  loaded: boolean;
  /** Changes made before the initial load finished; re-applied on top of it. */
  pendingChanges: ReadonlyMap<string, boolean>;
  setAll: (ids: Iterable<string>) => void;
  setOne: (productId: string, wishlisted: boolean) => void;
  reset: () => void;
};

function applyChange(
  ids: ReadonlySet<string>,
  productId: string,
  wishlisted: boolean,
): Set<string> {
  const next = new Set(ids);
  if (wishlisted) next.add(productId);
  else next.delete(productId);
  return next;
}

/** Not persisted: loaded from the server per session (see WishlistSync). */
export const useWishlistStore = create<WishlistState>()((set) => ({
  ids: new Set(),
  loaded: false,
  pendingChanges: new Map(),
  setAll: (ids) =>
    set((state) => {
      // A tap made while the initial load was in flight must win over the
      // (older) server snapshot, or the heart would flip back.
      let merged: ReadonlySet<string> = new Set(ids);
      for (const [productId, wishlisted] of state.pendingChanges) {
        merged = applyChange(merged, productId, wishlisted);
      }
      return { ids: merged, loaded: true, pendingChanges: new Map() };
    }),
  setOne: (productId, wishlisted) =>
    set((state) => ({
      ids: applyChange(state.ids, productId, wishlisted),
      pendingChanges: state.loaded
        ? state.pendingChanges
        : new Map(state.pendingChanges).set(productId, wishlisted),
    })),
  reset: () => set({ ids: new Set(), loaded: false, pendingChanges: new Map() }),
}));
