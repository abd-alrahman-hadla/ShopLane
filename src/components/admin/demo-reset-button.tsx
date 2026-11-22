"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RotateCcwIcon } from "lucide-react";
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
        `Demo restored: ${restoredProducts} products` +
          (archivedProducts ? `, ${archivedProducts} added products archived` : "") +
          (deactivatedCoupons ? `, ${deactivatedCoupons} added coupons turned off` : "") +
          ".",
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
          <Button variant="outline" size="sm" data-testid="demo-reset" aria-label="Reset demo data">
            <RotateCcwIcon data-icon="inline-start" />
            <span className="hidden md:inline">Reset demo data</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the demo data?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                <p>This puts the store back the way it was seeded, for everyone using the demo:</p>
                <ul className="list-disc pl-5">
                  <li>Seeded products, prices, stock, photos and coupons are restored.</li>
                  <li>Products and coupons added in the admin are archived or turned off.</li>
                  <li>Orders stay, so the order history and dashboard keep working.</li>
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
              className="text-sm font-medium text-emerald-800"
              data-testid="demo-reset-status"
            >
              {done}
            </p>
          )}
          <AlertDialogFooter>
            {done ? (
              <AlertDialogCancel>Close</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                <Button onClick={reset} disabled={isPending}>
                  {isPending ? "Resetting… (up to a minute)" : "Reset demo data"}
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
