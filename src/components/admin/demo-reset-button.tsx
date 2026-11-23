"use client";

import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import { RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { resetDemoDataAction } from "@/features/admin/demo/actions";

/** Demo mode only: puts the catalog, stock and coupons back to the seeded state. */
export function DemoResetButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const t = useTranslations("admin.demoReset");

  function reset(): void {
    setError(null);
    startTransition(async () => {
      const result = await resetDemoDataAction({});
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { restoredProducts, archivedProducts, deactivatedCoupons } = result.data;
      setDone(
        [
          t("restored", { count: restoredProducts }),
          archivedProducts ? t("archived", { count: archivedProducts }) : null,
          deactivatedCoupons ? t("deactivated", { count: deactivatedCoupons }) : null,
        ]
          .filter(Boolean)
          .join(t("separator")) + t("end"),
      );
      router.refresh();
    });
  }

  return (
    <>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          // Keep the dialog open while the reset runs.
          if (!isPending) setOpen(next);
          if (next) {
            setError(null);
            setDone(null);
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid="demo-reset" aria-label={t("button")}>
            <RotateCcwIcon data-icon="inline-start" />
            <span className="hidden md:inline">{t("button")}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("title")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                <p>{t("lead")}</p>
                <ul className="list-disc ps-5">
                  <li>{t("point1")}</li>
                  <li>{t("point2")}</li>
                  <li>{t("point3")}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          {done && (
            <p
              role="status"
              className="text-sm font-medium text-success"
              data-testid="demo-reset-status"
            >
              {done}
            </p>
          )}
          <AlertDialogFooter>
            {done ? (
              <AlertDialogCancel>{t("close")}</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
                <Button onClick={reset} disabled={isPending}>
                  {isPending ? t("resetting") : t("button")}
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
