"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { mergeCartOnSignIn, syncServerCart } from "@/features/cart/actions";
import { useCartHydrated, useCartStore } from "@/features/cart/store";

const SYNC_DEBOUNCE_MS = 800;

/**
 * Keeps the browser cart and the signed-in user's server cart together:
 * merges once per user on sign-in, saves changes while signed in, and clears
 * the browser cart on sign-out.
 */
export function CartSessionSync() {
  const { data: session, status } = useSession();
  const hydrated = useCartHydrated();
  const userId = session?.user?.id ?? null;
  const previousStatus = useRef(status);
  const merging = useRef(false);

  // Merge the guest cart into the server cart once per signed-in user.
  useEffect(() => {
    if (!hydrated || status !== "authenticated" || !userId || merging.current) return;
    const { mergedForUserId, items } = useCartStore.getState();
    if (mergedForUserId === userId) return;
    merging.current = true;
    void mergeCartOnSignIn(items)
      .then((result) => {
        if (!result.ok) return;
        useCartStore.getState().replaceItems(result.data);
        useCartStore.getState().setMergedForUserId(userId);
      })
      .finally(() => {
        merging.current = false;
      });
  }, [hydrated, status, userId]);

  // Clear the local cart when the user signs out (the server keeps theirs).
  useEffect(() => {
    if (previousStatus.current === "authenticated" && status === "unauthenticated") {
      useCartStore.getState().clear();
      useCartStore.getState().setMergedForUserId(null);
    }
    previousStatus.current = status;
  }, [status]);

  // Save changes to the server cart while signed in.
  useEffect(() => {
    if (!hydrated || status !== "authenticated" || !userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useCartStore.subscribe((state, previous) => {
      if (state.items === previous.items || state.mergedForUserId !== userId) return;
      clearTimeout(timer);
      timer = setTimeout(() => void syncServerCart(state.items), SYNC_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [hydrated, status, userId]);

  return null;
}
