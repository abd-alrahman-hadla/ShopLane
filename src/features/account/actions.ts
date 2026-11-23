"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { profileInputSchema, updateProfile } from "./profile";

export type ProfileFormState = { ok?: boolean; error?: string };

export async function saveProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser("/account");
  const parsed = profileInputSchema.safeParse({ name: String(formData.get("name") ?? "") });
  if (!parsed.success) return { error: (await getTranslations("account"))("nameInvalid") };
  await updateProfile(db, user.id, parsed.data);
  // Both languages' account pages show the name.
  revalidatePath("/[locale]/account", "layout");
  return { ok: true };
}
