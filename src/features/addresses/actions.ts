"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "./addresses";
import { addressFromFormData, addressInputSchema, MAX_ADDRESSES } from "./schemas";

const ADDRESSES_PATH = "/account/addresses";
const idSchema = z.string().min(1).max(40);

export type AddressFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

/** Create (no addressId) or update an address from the form. */
export async function saveAddress(
  _previous: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const user = await requireUser(ADDRESSES_PATH);
  const parsed = addressInputSchema.safeParse(addressFromFormData(formData));
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      Object.entries(z.flattenError(parsed.error).fieldErrors).map(([field, errors]) => [
        field,
        errors?.[0],
      ]),
    );
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const addressId = formData.get("addressId");
  const result =
    typeof addressId === "string" && addressId
      ? await updateAddress(db, user.id, addressId, parsed.data)
      : await createAddress(db, user.id, parsed.data);
  if (!result.ok) {
    return {
      error:
        result.error === "limit_reached"
          ? `You can save up to ${MAX_ADDRESSES} addresses.`
          : "That address no longer exists.",
    };
  }
  revalidatePath(ADDRESSES_PATH);
  return { ok: true };
}

export async function removeAddress(addressId: unknown): Promise<{ ok: boolean }> {
  const user = await requireUser(ADDRESSES_PATH);
  const parsed = idSchema.safeParse(addressId);
  if (!parsed.success) return { ok: false };
  const result = await deleteAddress(db, user.id, parsed.data);
  revalidatePath(ADDRESSES_PATH);
  return { ok: result.ok };
}

export async function makeDefaultAddress(addressId: unknown): Promise<{ ok: boolean }> {
  const user = await requireUser(ADDRESSES_PATH);
  const parsed = idSchema.safeParse(addressId);
  if (!parsed.success) return { ok: false };
  const result = await setDefaultAddress(db, user.id, parsed.data);
  revalidatePath(ADDRESSES_PATH);
  return { ok: result.ok };
}
