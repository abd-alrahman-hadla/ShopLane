"use client";

import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartHydrated, useCartStore } from "@/features/cart/store";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/features/checkout/pricing";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CartLine } from "./cart-line";
import { CheckoutButton } from "./checkout-button";
import { CouponForm } from "./coupon-form";
import { useCartQuote } from "./use-cart-quote";

function TotalRow({
  label,
  value,
  strong = false,
  testId,
}: {
  label: string;
  value: string;
  strong?: boolean;
  testId?: string;
}) {
  return (
    <div className={cn("flex justify-between text-sm", strong && "text-base font-semibold")}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

/** Cart lines, coupon, totals and checkout. Used by the drawer and /cart. */
export function CartContents({
  active = true,
  onNavigate,
}: {
  active?: boolean;
  onNavigate?: () => void;
}) {
  const hydrated = useCartHydrated();
  const itemCount = useCartStore((state) => state.items.length);
  const { quote, error, isPending, refresh } = useCartQuote(hydrated && active && itemCount > 0);

  if (!hydrated || (itemCount > 0 && !quote)) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-20 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (itemCount === 0 || !quote) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <ShoppingBagIcon className="text-muted-foreground size-10" aria-hidden />
        <p className="font-medium">Your cart is empty</p>
        <Link
          href="/products"
          onClick={onNavigate}
          className="text-sm underline underline-offset-4"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  const { totals } = quote;
  const toFreeShipping =
    FREE_SHIPPING_THRESHOLD_CENTS - (totals.subtotalCents - totals.discountCents);

  return (
    <div
      className={cn("flex flex-col gap-6 transition-opacity", isPending && "opacity-70")}
      aria-busy={isPending}
    >
      <ul className="divide-y" data-testid="cart-lines">
        {quote.lines.map((line) => (
          <CartLine key={line.variantId} line={line} />
        ))}
      </ul>
      <CouponForm coupon={quote.coupon} />
      <div className="flex flex-col gap-2 border-t pt-4">
        <TotalRow
          label="Subtotal"
          value={formatCents(totals.subtotalCents)}
          testId="cart-subtotal"
        />
        {totals.discountCents > 0 && (
          <TotalRow
            label="Discount"
            value={`−${formatCents(totals.discountCents)}`}
            testId="cart-discount"
          />
        )}
        <TotalRow
          label="Shipping"
          value={totals.shippingCents === 0 ? "Free" : formatCents(totals.shippingCents)}
          testId="cart-shipping"
        />
        <TotalRow label="Total" value={formatCents(totals.totalCents)} strong testId="cart-total" />
        {totals.shippingCents > 0 && toFreeShipping > 0 && (
          <p className="text-muted-foreground text-xs">
            Add {formatCents(toFreeShipping)} more for free shipping.
          </p>
        )}
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <CheckoutButton disabled={!quote.canCheckout || isPending} onCartChanged={refresh} />
      {!quote.canCheckout && (
        <p className="text-muted-foreground text-center text-xs">
          Update the highlighted items to continue.
        </p>
      )}
    </div>
  );
}
