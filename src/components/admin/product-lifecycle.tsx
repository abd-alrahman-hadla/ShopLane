"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("admin.productPage");

  function run(action: (input: unknown) => Promise<{ ok: boolean; error?: string }>): void {
    setError(null);
    startTransition(async () => {
      const result = await action({ productId });
      if (!result.ok) setError(result.error ?? t("error"));
      else router.refresh();
    });
  }

  if (archived) {
    return (
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => run(restoreProduct)} disabled={isPending}>
          <ArchiveRestoreIcon data-icon="inline-start" />
          {t("restore")}
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
            {t("archive")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("archiveTitle", { name: productName })}</AlertDialogTitle>
            <AlertDialogDescription>{t("archiveBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => run(archiveProduct)}>
              {t("archiveConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
