"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { makeDefaultAddress, removeAddress } from "@/features/addresses/actions";
import { AddressForm, type AddressValues } from "./address-form";

export function AddressCard({
  address,
  isDefault,
}: {
  address: AddressValues & { id: string };
  isDefault: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("addresses");

  if (editing) {
    return (
      <li className="rounded-xl border p-4">
        <AddressForm address={address} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border p-4" data-testid="address-card">
      {/* US addresses keep their Latin, left-to-right order in every language. */}
      <address className="text-sm leading-relaxed not-italic" dir="ltr">
        <span className="font-medium">{address.fullName}</span>
        {isDefault && (
          <span
            className="bg-secondary ms-2 rounded-full px-2 py-0.5 text-xs font-medium"
            dir="auto"
          >
            {t("default")}
          </span>
        )}
        <br />
        {address.line1}
        {address.line2 && (
          <>
            <br />
            {address.line2}
          </>
        )}
        <br />
        {address.city}, {address.region} {address.postalCode}
        {address.phone && (
          <>
            <br />
            {address.phone}
          </>
        )}
      </address>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          {t("edit")}
        </Button>
        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(async () => void (await makeDefaultAddress(address.id)))}
          >
            {t("makeDefault")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(async () => void (await removeAddress(address.id)))}
          aria-label={t("deleteLabel", { name: address.fullName, line1: address.line1 })}
        >
          {t("delete")}
        </Button>
      </div>
    </li>
  );
}
