"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deleteCoupon, setCouponActive } from "@/features/admin/coupons/actions";

export function CouponActiveSwitch({
  couponId,
  code,
  isActive,
}: {
  couponId: string;
  code: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(isActive);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={checked}
        disabled={isPending}
        aria-label={`${code} active`}
        onCheckedChange={(next) => {
          setChecked(next);
          setError(null);
          startTransition(async () => {
            const result = await setCouponActive({ couponId, isActive: next });
            if (!result.ok) {
              setChecked(!next);
              setError(result.error);
            } else {
              router.refresh();
            }
          });
        }}
      />
      {error && (
        <span className="text-destructive text-xs" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function DeleteCouponButton({
  couponId,
  code,
  used,
}: {
  couponId: string;
  code: string;
  used: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (used) return null; // Used coupons are deactivated, never deleted.
  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            aria-label={`Delete coupon ${code}`}
          >
            <Trash2Icon data-icon="inline-start" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {code}?</AlertDialogTitle>
            <AlertDialogDescription>
              It has never been used. This can&apos;t be undone (the audit log keeps a record).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteCoupon({ couponId });
                  if (!result.ok) setError(result.error);
                  else router.refresh();
                })
              }
            >
              Delete coupon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && (
        <span className="text-destructive text-xs" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
