"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY_PER_LINE } from "@/features/cart/cart";
import type { CartQuoteLine } from "@/features/cart/quote";
import { useCartStore } from "@/features/cart/store";
import { variantLabel } from "@/features/catalog/variant-labels";
import type { Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/format";

export function CartLine({ line }: { line: CartQuoteLine }) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;
  const { variant } = line;

  if (!variant) {
    return (
      <li className="flex items-center justify-between gap-3 py-4" data-testid="cart-line">
        <p className="text-muted-foreground text-sm">{t("unavailable")}</p>
        <Button variant="ghost" size="sm" onClick={() => remove(line.variantId)}>
          {t("remove")}
        </Button>
      </li>
    );
  }

  const max = Math.min(variant.stock, MAX_QUANTITY_PER_LINE);
  const title = variantLabel(variant.title, locale);
  const name = `${variant.product.name}, ${title}`;

  return (
    <li className="flex gap-3 py-4" data-testid="cart-line">
      <Link
        href={`/products/${variant.product.slug}`}
        className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg"
      >
        {variant.imageUrl && (
          <Image
            src={variant.imageUrl}
            alt={variant.imageAlt ?? ""}
            fill
            sizes="80px"
            className="object-cover"
          />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/products/${variant.product.slug}`}
              className="line-clamp-2 text-sm font-medium hover:underline"
            >
              {variant.product.name}
            </Link>
            <p className="text-muted-foreground text-xs">{title}</p>
          </div>
          <p className="text-sm font-medium tabular-nums" data-testid="cart-line-total">
            {formatMoney(variant.priceCents * line.quantity, locale)}
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div
            className="flex items-center rounded-lg border"
            role="group"
            aria-label={t("quantityFor", { name })}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("decrease", { name })}
              onClick={() => setQuantity(line.variantId, line.quantity - 1)}
            >
              <MinusIcon />
            </Button>
            <span className="w-8 text-center text-sm tabular-nums" data-testid="cart-line-quantity">
              {line.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("increase", { name })}
              disabled={line.quantity >= max}
              onClick={() => setQuantity(line.variantId, line.quantity + 1, max)}
            >
              <PlusIcon />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("removeItem", { name })}
            onClick={() => remove(line.variantId)}
          >
            <Trash2Icon />
          </Button>
        </div>
        {line.status === "insufficient" && (
          <p className="text-warning text-sm" role="status">
            {variant.stock === 0 ? t("soldOut") : t("onlyLeft", { count: variant.stock })}{" "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => setQuantity(line.variantId, variant.stock, variant.stock)}
            >
              {variant.stock === 0 ? t("remove") : t("updateTo", { count: variant.stock })}
            </button>
          </p>
        )}
      </div>
    </li>
  );
}
