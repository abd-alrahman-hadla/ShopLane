"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/lib/auth";

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
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    callbackUrl: formData.get("callbackUrl") || undefined,
  });
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  try {
    await signIn("resend", {
      email: parsed.data.email,
      redirectTo: parsed.data.callbackUrl ?? "/",
    });
  } catch (error) {
    // signIn redirects to the "check your email" page by throwing NEXT_REDIRECT.
    if (error instanceof AuthError) {
      return { error: "We couldn’t send the sign-in email. Please try again." };
    }
    throw error;
  }
  redirect("/sign-in/check-email");
}
