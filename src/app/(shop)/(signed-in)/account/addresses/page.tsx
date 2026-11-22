import type { Metadata } from "next";
import { AddAddress } from "@/components/shop/account/add-address";
import { AddressCard } from "@/components/shop/account/address-card";
import { listAddresses } from "@/features/addresses/addresses";
import { MAX_ADDRESSES } from "@/features/addresses/schemas";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await listAddresses(db, user.id);

  return (
    <section aria-labelledby="addresses-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="addresses-heading" className="text-xl font-semibold">
          Addresses
        </h2>
        <p className="text-muted-foreground text-sm">
          Save up to {MAX_ADDRESSES} US shipping addresses.
        </p>
      </div>
      {addresses.length === 0 && (
        <p className="text-muted-foreground text-sm">No saved addresses yet.</p>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <AddressCard key={address.id} address={address} isDefault={address.isDefault} />
        ))}
      </ul>
      <AddAddress disabled={addresses.length >= MAX_ADDRESSES} />
    </section>
  );
}
