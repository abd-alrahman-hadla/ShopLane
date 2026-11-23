"use client";

import { useRouter } from "@/i18n/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { PackageCheckIcon, RotateCcwIcon, TruckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markOrderPacked, refundOrder, shipOrder } from "@/features/admin/orders/actions";
import { REFUND_REASONS } from "@/features/admin/orders/schemas";
import { CARRIERS } from "@/features/admin/orders/transitions";
import { centsToPriceInput, parsePriceToCents } from "@/features/admin/products/schemas";
import type { Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/format";

type RefundableItem = {
  id: string;
  label: string;
  quantity: number;
  restockedQuantity: number;
  canRestock: boolean;
};

type OrderActionsProps = {
  orderId: string;
  status: string;
  currency: string;
  refundableCents: number;
  canRefund: boolean;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  items: RefundableItem[];
};

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3";

function useAction() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const t = useTranslations("admin.orderActions");

  function run(
    task: () => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>,
    success: string,
    onDone?: () => void,
  ): void {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        // Field messages too: some fields (like the order ID) aren't on the form to highlight.
        const details = Object.values(result.fieldErrors ?? {}).join(" ");
        setError([result.error ?? t("error"), details].filter(Boolean).join(" "));
        return;
      }
      setMessage(success);
      onDone?.();
      router.refresh();
    });
  }
  return { run, isPending, error, message };
}

function ShipForm({
  orderId,
  status,
  trackingCarrier,
  trackingNumber,
}: Pick<OrderActionsProps, "orderId" | "status" | "trackingCarrier" | "trackingNumber">) {
  const { run, isPending, error, message } = useAction();
  const carrierId = useId();
  const numberId = useId();
  const shipped = status === "SHIPPED";
  const t = useTranslations("admin.orderActions");

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(
      () =>
        shipOrder({
          orderId,
          carrier: String(data.get("carrier")),
          trackingNumber: String(data.get("trackingNumber") ?? ""),
        }),
      shipped ? t("trackingUpdated") : t("shippedDone"),
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" data-testid="ship-form">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={carrierId}>{t("carrier")}</Label>
          <select
            id={carrierId}
            name="carrier"
            defaultValue={trackingCarrier ?? "USPS"}
            className={selectClass}
          >
            {CARRIERS.map((carrier) => (
              <option key={carrier} value={carrier}>
                {carrier}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor={numberId}>{t("trackingNumber")}</Label>
          <Input
            id={numberId}
            name="trackingNumber"
            defaultValue={trackingNumber ?? ""}
            required
            minLength={4}
            maxLength={60}
            dir="ltr"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          <TruckIcon data-icon="inline-start" />
          {shipped ? t("updateTracking") : t("markShipped")}
        </Button>
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-success" role="status">
          {message}
        </p>
      )}
    </form>
  );
}

function RefundDialog({
  orderId,
  currency,
  refundableCents,
  items,
}: Pick<OrderActionsProps, "orderId" | "currency" | "refundableCents" | "items">) {
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [amount, setAmount] = useState(centsToPriceInput(refundableCents));
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { run, isPending, error } = useAction();
  const amountId = useId();
  const reasonId = useId();
  const noteId = useId();
  const t = useTranslations("admin.orderActions");
  const locale = useLocale() as Locale;
  const maxAmount = formatMoney(refundableCents, locale, currency);

  function onOpenChange(next: boolean): void {
    setOpen(next);
    if (next) {
      // One ID per dialog opening: a double submit reuses it, so Stripe refunds once.
      setRequestId(crypto.randomUUID());
      setAmount(centsToPriceInput(refundableCents));
      setFieldError(null);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const amountCents = parsePriceToCents(amount);
    if (amountCents === null || amountCents <= 0) return setFieldError(t("errAmount"));
    if (amountCents > refundableCents) return setFieldError(t("errAtMost", { amount: maxAmount }));
    setFieldError(null);
    const data = new FormData(event.currentTarget);
    const restock = items
      .filter((item) => item.canRestock)
      .map((item) => ({
        orderItemId: item.id,
        quantity: Number(data.get(`restock-${item.id}`) ?? 0) || 0,
      }));
    run(
      () =>
        refundOrder({
          orderId,
          requestId,
          amountCents,
          reason: String(data.get("reason")),
          note: String(data.get("note") ?? ""),
          restock,
        }),
      t("refundIssued"),
      () => setOpen(false),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RotateCcwIcon data-icon="inline-start" />
          {t("refund")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" data-testid="refund-form">
          <DialogHeader>
            <DialogTitle>{t("refundTitle")}</DialogTitle>
            <DialogDescription>{t("refundBody", { amount: maxAmount })}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={amountId}>{t("amount")}</Label>
            <Input
              id={amountId}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? `${amountId}-error` : undefined}
            />
            {fieldError && (
              <p id={`${amountId}-error`} className="text-destructive text-sm">
                {fieldError}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId}>{t("reason")}</Label>
            <select
              id={reasonId}
              name="reason"
              defaultValue="requested_by_customer"
              className={selectClass}
            >
              {REFUND_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {t(`reasons.${reason}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={noteId}>{t("note")}</Label>
            <Input id={noteId} name="note" maxLength={200} />
          </div>
          {items.some((item) => item.canRestock) && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">{t("returnToStock")}</legend>
              {items
                .filter((item) => item.canRestock)
                .map((item) => {
                  const max = item.quantity - item.restockedQuantity;
                  return (
                    <label
                      key={item.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span>
                        {item.label}
                        <span className="text-muted-foreground"> {t("upTo", { max })}</span>
                      </span>
                      <Input
                        type="number"
                        name={`restock-${item.id}`}
                        min={0}
                        max={max}
                        defaultValue={0}
                        className="w-20"
                        aria-label={t("restockLabel", { item: item.label })}
                      />
                    </label>
                  );
                })}
            </fieldset>
          )}
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("refunding") : t("issueRefund")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Status changes and refunds for one order. Every action is re-authorized and audited on the server. */
export function OrderActions(props: OrderActionsProps) {
  const pack = useAction();
  const t = useTranslations("admin.orderActions");
  const canShip = ["PAID", "FULFILLED", "SHIPPED"].includes(props.status);

  return (
    <section
      aria-labelledby="actions-heading"
      className="bg-card flex flex-col gap-4 rounded-xl border p-4"
    >
      <h2 id="actions-heading" className="font-medium">
        {t("title")}
      </h2>
      {props.status === "PAID" && (
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="self-start"
            disabled={pack.isPending}
            onClick={() =>
              pack.run(() => markOrderPacked({ orderId: props.orderId }), t("packedDone"))
            }
          >
            <PackageCheckIcon data-icon="inline-start" />
            {t("markPacked")}
          </Button>
          {pack.error && (
            <p className="text-destructive text-sm" role="alert">
              {pack.error}
            </p>
          )}
          {pack.message && (
            <p className="text-sm text-success" role="status">
              {pack.message}
            </p>
          )}
        </div>
      )}
      {canShip ? (
        <ShipForm
          orderId={props.orderId}
          status={props.status}
          trackingCarrier={props.trackingCarrier}
          trackingNumber={props.trackingNumber}
        />
      ) : (
        <p className="text-muted-foreground text-sm">{t("noActions")}</p>
      )}
      {props.canRefund && props.refundableCents > 0 && (
        <div className="border-t pt-4">
          <RefundDialog
            orderId={props.orderId}
            currency={props.currency}
            refundableCents={props.refundableCents}
            items={props.items}
          />
        </div>
      )}
    </section>
  );
}
