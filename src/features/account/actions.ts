"use server";

import { revalidatePath } from "next/cache";
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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name." };
  await updateProfile(db, user.id, parsed.data);
  revalidatePath("/account", "layout");
  return { ok: true };
}
