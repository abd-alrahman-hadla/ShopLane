"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "./addresses";
import { addressFromFormData, addressInputSchema, MAX_ADDRESSES } from "./schemas";

const ADDRESSES_PATH = "/account/addresses";
/** Revalidates the page in every language. */
const ADDRESSES_ROUTE = "/[locale]/account/addresses";
const INVALID_FORMAT_KEYS: Record<string, string> = {
  region: "chooseState",
  postalCode: "zip",
  phone: "phone",
};
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
  const t = await getTranslations("addresses");
  const parsed = addressInputSchema.safeParse(addressFromFormData(formData));
  if (!parsed.success) {
    // One message per field, in the shopper's language (the schema's own text is English).
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (!field || fieldErrors[field]) continue;
      const label = t(`fields.${field}`);
      fieldErrors[field] =
        issue.code === "too_small"
          ? t("errors.required", { field: label })
          : issue.code === "too_big"
            ? t("errors.tooLong", { field: label })
            : t(`errors.${INVALID_FORMAT_KEYS[field] ?? "invalid"}`, { field: label });
    }
    return { error: t("errors.fixFields"), fieldErrors };
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
          ? t("errors.limit", { max: MAX_ADDRESSES })
          : t("errors.gone"),
    };
  }
  revalidatePath(ADDRESSES_ROUTE, "page");
  return { ok: true };
}

export async function removeAddress(addressId: unknown): Promise<{ ok: boolean }> {
  const user = await requireUser(ADDRESSES_PATH);
  const parsed = idSchema.safeParse(addressId);
  if (!parsed.success) return { ok: false };
  const result = await deleteAddress(db, user.id, parsed.data);
  revalidatePath(ADDRESSES_ROUTE, "page");
  return { ok: result.ok };
}

export async function makeDefaultAddress(addressId: unknown): Promise<{ ok: boolean }> {
  const user = await requireUser(ADDRESSES_PATH);
  const parsed = idSchema.safeParse(addressId);
  if (!parsed.success) return { ok: false };
  const result = await setDefaultAddress(db, user.id, parsed.data);
  revalidatePath(ADDRESSES_ROUTE, "page");
  return { ok: result.ok };
}
