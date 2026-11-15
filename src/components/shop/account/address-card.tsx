"use client";

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

  if (editing) {
    return (
      <li className="rounded-xl border p-4">
        <AddressForm address={address} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border p-4" data-testid="address-card">
      <address className="text-sm leading-relaxed not-italic">
        <span className="font-medium">{address.fullName}</span>
        {isDefault && (
          <span className="bg-secondary ml-2 rounded-full px-2 py-0.5 text-xs font-medium">
            Default
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
          Edit
        </Button>
        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(async () => void (await makeDefaultAddress(address.id)))}
          >
            Make default
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(async () => void (await removeAddress(address.id)))}
          aria-label={`Delete address for ${address.fullName}, ${address.line1}`}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}
