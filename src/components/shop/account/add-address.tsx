"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddressForm } from "./address-form";

export function AddAddress({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!open) {
    return (
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="self-start"
      >
        <PlusIcon data-icon="inline-start" />
        Add address
      </Button>
    );
  }
  return (
    <div className="rounded-xl border p-4">
      <AddressForm onDone={close} />
    </div>
  );
}
