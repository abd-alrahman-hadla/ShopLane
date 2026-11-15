"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { HeartIcon } from "lucide-react";
import { setWishlistedAction } from "@/features/wishlist/actions";
import { useWishlistStore } from "@/features/wishlist/store";
import { cn } from "@/lib/utils";

type WishlistButtonProps = {
  productId: string;
  productName: string;
  className?: string;
  /** "icon" overlays product images; "labelled" sits next to Add to cart. */
  variant?: "icon" | "labelled";
};

/**
 * Optimistic heart. Signed-out shoppers are sent to sign-in and returned to
 * the page they were on.
 */
export function WishlistButton({
  productId,
  productName,
  className,
  variant = "icon",
}: WishlistButtonProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const wishlisted = useWishlistStore((state) => state.ids.has(productId));
  const setOne = useWishlistStore((state) => state.setOne);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(): void {
    if (status !== "authenticated") {
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !wishlisted;
    setError(null);
    setOne(productId, next);
    startTransition(async () => {
      const result = await setWishlistedAction({ productId, wishlisted: next });
      if (!result.ok) {
        setOne(productId, !next);
        setError(
          result.error === "wishlist_full"
            ? "Your wishlist is full."
            : "Couldn’t update your wishlist.",
        );
      }
    });
  }

  const label = wishlisted
    ? `Remove ${productName} from wishlist`
    : `Save ${productName} to wishlist`;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={wishlisted}
        aria-label={variant === "icon" ? label : undefined}
        disabled={status === "loading" || isPending}
        title={label}
        data-testid="wishlist-button"
        className={cn(
          "focus-visible:ring-ring/50 inline-flex items-center justify-center gap-2 transition-colors outline-none focus-visible:ring-3 disabled:opacity-70",
          variant === "icon"
            ? "bg-background/90 hover:bg-background size-9 rounded-full shadow-sm backdrop-blur"
            : "hover:bg-muted h-11 rounded-lg border px-4 text-sm font-medium",
          className,
        )}
      >
        <HeartIcon
          aria-hidden
          className={cn("size-4.5", wishlisted ? "fill-red-600 text-red-600" : "text-foreground")}
        />
        {variant === "labelled" && (wishlisted ? "Saved" : "Save to wishlist")}
      </button>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </>
  );
}
