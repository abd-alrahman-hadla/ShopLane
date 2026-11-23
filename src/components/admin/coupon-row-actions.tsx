"use client";

import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("admin.coupons");

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={checked}
        disabled={isPending}
        aria-label={t("activeLabel", { code })}
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

  const t = useTranslations("admin.coupons");
  if (used) return null; // Used coupons are deactivated, never deleted.
  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            aria-label={t("deleteLabel", { code })}
          >
            <Trash2Icon data-icon="inline-start" />
            {t("delete")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle", { code })}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteCoupon({ couponId });
                  if (!result.ok) setError(result.error);
                  else router.refresh();
                })
              }
            >
              {t("deleteConfirm")}
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
