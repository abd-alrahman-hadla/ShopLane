import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";

export type SessionUser = { id: string; email: string; name: string | null; role: Role };

/** The signed-in user, or null. Reads cookies, so only call from dynamic routes. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return { id: user.id, email: user.email, name: user.name ?? null, role: user.role };
}

/** Builds the sign-in URL that returns to `callbackPath` (relative paths only). */
export function signInPath(callbackPath: string): string {
  const safe = callbackPath.startsWith("/") && !callbackPath.startsWith("//") ? callbackPath : "/";
  return `/sign-in?callbackUrl=${encodeURIComponent(safe)}`;
}

/** The signed-in user, or a redirect to sign-in that comes back to `callbackPath`. */
export async function requireUser(callbackPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(signInPath(callbackPath));
  return user;
}
