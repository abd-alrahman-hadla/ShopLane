"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
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
import { saveCoupon } from "@/features/admin/coupons/actions";
import { centsToPriceInput, parsePriceToCents } from "@/features/admin/products/schemas";

export type CouponValues = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  minSubtotalCents: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3";

/** ISO → value for <input type="datetime-local"> in the admin's local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** datetime-local (admin's local time) → ISO with offset, or "" when empty. */
function fromLocalInput(value: string): string {
  return value ? new Date(value).toISOString() : "";
}

export function CouponDialog({ coupon }: { coupon?: CouponValues }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CouponValues["type"]>(coupon?.type ?? "PERCENTAGE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const id = useId();
  const used = (coupon?.redemptionCount ?? 0) > 0;

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (name: string) => String(data.get(name) ?? "").trim();
    const nextErrors: Record<string, string> = {};

    const rawValue = get("value");
    const value =
      type === "PERCENTAGE"
        ? /^\d+$/.test(rawValue)
          ? Number(rawValue)
          : null
        : parsePriceToCents(rawValue);
    if (value === null)
      nextErrors.value = type === "PERCENTAGE" ? "Whole percent, e.g. 10." : "Amount like 5.00.";
    const minRaw = get("minSubtotal");
    const minSubtotalCents = minRaw ? parsePriceToCents(minRaw) : null;
    if (minRaw && minSubtotalCents === null) nextErrors.minSubtotalCents = "Amount like 40.00.";
    const maxRaw = get("maxRedemptions");
    const maxRedemptions = maxRaw ? (/^\d+$/.test(maxRaw) ? Number(maxRaw) : null) : null;
    if (maxRaw && maxRedemptions === null) nextErrors.maxRedemptions = "Whole number.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await saveCoupon({
        id: coupon?.id ?? null,
        code: get("code"),
        type,
        value,
        minSubtotalCents,
        maxRedemptions,
        startsAt: fromLocalInput(get("startsAt")),
        endsAt: fromLocalInput(get("endsAt")),
        isActive: data.get("isActive") === "on",
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const field = (name: string) => ({
    id: `${id}-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
  });
  const error = (name: string) =>
    errors[name] ? (
      <p id={`${id}-${name}-error`} className="text-destructive text-sm">
        {errors[name]}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {coupon ? (
          <Button variant="ghost" size="sm" aria-label={`Edit coupon ${coupon.code}`}>
            <PencilIcon data-icon="inline-start" />
            Edit
          </Button>
        ) : (
          <Button>
            <PlusIcon data-icon="inline-start" />
            New coupon
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" data-testid="coupon-form">
          <DialogHeader>
            <DialogTitle>{coupon ? `Edit ${coupon.code}` : "New coupon"}</DialogTitle>
            <DialogDescription>
              {used
                ? `Redeemed ${coupon?.redemptionCount} times, so its type and value are locked.`
                : "Codes are case-insensitive for shoppers."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={`${id}-code`}>Code</Label>
              <Input
                {...field("code")}
                name="code"
                defaultValue={coupon?.code}
                required
                maxLength={32}
                className="uppercase"
              />
              {error("code")}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-type`}>Type</Label>
              <select
                id={`${id}-type`}
                className={selectClass}
                value={type}
                disabled={used}
                onChange={(event) => setType(event.target.value as CouponValues["type"])}
              >
                <option value="PERCENTAGE">Percent off</option>
                <option value="FIXED_AMOUNT">Amount off ($)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-value`}>
                {type === "PERCENTAGE" ? "Percent" : "Amount ($)"}
              </Label>
              <Input
                {...field("value")}
                name="value"
                readOnly={used}
                inputMode={type === "PERCENTAGE" ? "numeric" : "decimal"}
                defaultValue={
                  coupon
                    ? coupon.type === "PERCENTAGE"
                      ? String(coupon.value)
                      : centsToPriceInput(coupon.value)
                    : ""
                }
                required
              />
              {error("value")}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-minSubtotalCents`}>Minimum order ($, optional)</Label>
              <Input
                {...field("minSubtotalCents")}
                name="minSubtotal"
                inputMode="decimal"
                defaultValue={centsToPriceInput(coupon?.minSubtotalCents)}
              />
              {error("minSubtotalCents")}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-maxRedemptions`}>Usage limit (optional)</Label>
              <Input
                {...field("maxRedemptions")}
                name="maxRedemptions"
                inputMode="numeric"
                defaultValue={coupon?.maxRedemptions ?? ""}
              />
              {error("maxRedemptions")}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-startsAt`}>Starts (optional)</Label>
              <Input
                {...field("startsAt")}
                name="startsAt"
                type="datetime-local"
                defaultValue={toLocalInput(coupon?.startsAt ?? null)}
              />
              {error("startsAt")}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-endsAt`}>Ends (optional)</Label>
              <Input
                {...field("endsAt")}
                name="endsAt"
                type="datetime-local"
                defaultValue={toLocalInput(coupon?.endsAt ?? null)}
              />
              {error("endsAt")}
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={coupon?.isActive ?? true}
                className="size-4"
              />
              Active
            </label>
          </div>
          {formError && (
            <p className="text-destructive text-sm" role="alert">
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : coupon ? "Save coupon" : "Create coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
