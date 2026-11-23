"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AddressForm } from "./address-form";

export function AddAddress({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const t = useTranslations("addresses");

  if (!open) {
    return (
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="self-start"
      >
        <PlusIcon data-icon="inline-start" />
        {t("add")}
      </Button>
    );
  }
  return (
    <div className="rounded-xl border p-4">
      <AddressForm onDone={close} />
    </div>
  );
}
