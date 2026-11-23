"use server";

import { AuthError } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";

const signInSchema = z.object({
  email: z.email().max(254),
  callbackUrl: z
    .string()
    .regex(/^\/(?!\/)/, "must be a relative path")
    .max(500)
    .optional(),
});

export type SignInState = { error?: string };

/** Sends a magic link. Only relative callback URLs are accepted (no open redirect). */
export async function requestMagicLink(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const [t, locale] = await Promise.all([getTranslations("auth"), getLocale()]);
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    callbackUrl: formData.get("callbackUrl") || undefined,
  });
  if (!parsed.success) {
    return { error: t("invalidEmail") };
  }

  try {
    await signIn("resend", {
      email: parsed.data.email,
      redirectTo: parsed.data.callbackUrl ?? (locale === "en" ? "/" : `/${locale}`),
    });
  } catch (error) {
    // signIn redirects to the "check your email" page by throwing NEXT_REDIRECT.
    if (error instanceof AuthError) {
      return { error: t("sendFailed") };
    }
    throw error;
  }
  redirect(getPathname({ href: "/sign-in/check-email", locale: locale as Locale }));
}

/** Ends the session server-side (the database row is deleted), then goes to the store. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
