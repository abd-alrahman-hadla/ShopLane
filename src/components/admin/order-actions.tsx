"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { PackageCheckIcon, RotateCcwIcon, TruckIcon } from "lucide-react";
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
import { formatCents } from "@/lib/money";

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

const REASON_LABELS: Record<(typeof REFUND_REASONS)[number], string> = {
  requested_by_customer: "Requested by customer",
  duplicate: "Duplicate charge",
  fraudulent: "Fraudulent",
};

function useAction() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        setError([result.error ?? "Something went wrong.", details].filter(Boolean).join(" "));
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
      shipped
        ? "Tracking updated. The customer was emailed the new number."
        : "Marked as shipped. The customer was emailed.",
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" data-testid="ship-form">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={carrierId}>Carrier</Label>
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
          <Label htmlFor={numberId}>Tracking number</Label>
          <Input
            id={numberId}
            name="trackingNumber"
            defaultValue={trackingNumber ?? ""}
            required
            minLength={4}
            maxLength={60}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          <TruckIcon data-icon="inline-start" />
          {shipped ? "Update tracking" : "Mark shipped"}
        </Button>
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-emerald-700" role="status">
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
    if (amountCents === null || amountCents <= 0)
      return setFieldError("Enter an amount like 12.50.");
    if (amountCents > refundableCents)
      return setFieldError(`At most ${formatCents(refundableCents, currency)}.`);
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
      "Refund issued.",
      () => setOpen(false),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RotateCcwIcon data-icon="inline-start" />
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" data-testid="refund-form">
          <DialogHeader>
            <DialogTitle>Refund through Stripe</DialogTitle>
            <DialogDescription>
              Up to {formatCents(refundableCents, currency)} can be refunded. This can&apos;t be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={amountId}>Amount ($)</Label>
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
            <Label htmlFor={reasonId}>Reason</Label>
            <select
              id={reasonId}
              name="reason"
              defaultValue="requested_by_customer"
              className={selectClass}
            >
              {REFUND_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {REASON_LABELS[reason]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={noteId}>Internal note (optional)</Label>
            <Input id={noteId} name="note" maxLength={200} />
          </div>
          {items.some((item) => item.canRestock) && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Return to stock</legend>
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
                        <span className="text-muted-foreground"> (up to {max})</span>
                      </span>
                      <Input
                        type="number"
                        name={`restock-${item.id}`}
                        min={0}
                        max={max}
                        defaultValue={0}
                        className="w-20"
                        aria-label={`Units of ${item.label} to return to stock`}
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
              {isPending ? "Refunding…" : "Issue refund"}
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
  const canShip = ["PAID", "FULFILLED", "SHIPPED"].includes(props.status);

  return (
    <section
      aria-labelledby="actions-heading"
      className="bg-card flex flex-col gap-4 rounded-xl border p-4"
    >
      <h2 id="actions-heading" className="font-medium">
        Fulfilment
      </h2>
      {props.status === "PAID" && (
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="self-start"
            disabled={pack.isPending}
            onClick={() =>
              pack.run(() => markOrderPacked({ orderId: props.orderId }), "Marked as packed.")
            }
          >
            <PackageCheckIcon data-icon="inline-start" />
            Mark packed
          </Button>
          {pack.error && (
            <p className="text-destructive text-sm" role="alert">
              {pack.error}
            </p>
          )}
          {pack.message && (
            <p className="text-sm text-emerald-700" role="status">
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
        <p className="text-muted-foreground text-sm">No fulfilment actions for this order.</p>
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
