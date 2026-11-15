"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { getMyWishlistIds } from "@/features/wishlist/actions";
import { useWishlistStore } from "@/features/wishlist/store";

/** Loads the signed-in user's wishlist once per session; clears it on sign-out. */
export function WishlistSync() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (status === "unauthenticated") {
      useWishlistStore.getState().reset();
      return;
    }
    if (status !== "authenticated" || !userId) return;
    let cancelled = false;
    void getMyWishlistIds().then((ids) => {
      if (!cancelled) useWishlistStore.getState().setAll(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  return null;
}
