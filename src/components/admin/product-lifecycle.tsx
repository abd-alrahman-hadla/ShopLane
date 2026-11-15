"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
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
import { archiveProduct, restoreProduct } from "@/features/admin/products/actions";

/** Archive (with confirmation) or restore. Products are never deleted. */
export function ProductLifecycle({
  productId,
  productName,
  archived,
}: {
  productId: string;
  productName: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (input: unknown) => Promise<{ ok: boolean; error?: string }>): void {
    setError(null);
    startTransition(async () => {
      const result = await action({ productId });
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else router.refresh();
    });
  }

  if (archived) {
    return (
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => run(restoreProduct)} disabled={isPending}>
          <ArchiveRestoreIcon data-icon="inline-start" />
          Restore as draft
        </Button>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={isPending}>
            <ArchiveIcon data-icon="inline-start" />
            Archive
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {productName}?</AlertDialogTitle>
            <AlertDialogDescription>
              It disappears from the store, search and wishlists, but stays in order history. You
              can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => run(archiveProduct)}>
              Archive product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
