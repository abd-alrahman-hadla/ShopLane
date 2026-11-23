import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import type { DbClient } from "@/features/cart/quote";
import { getSessionUser, signInPath, type SessionUser } from "@/lib/auth-guards";
import { sessionTokenFromCookieHeader } from "./session-cookie";

/**
 * The signed-in admin, or null. The role comes from the database session on
 * every call, so revoking ADMIN takes effect on the next request.
 */
export async function getAdminUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.role === "ADMIN" ? user : null;
}

/** For admin pages: sign-in for anonymous users, 404 for everyone else who isn't an admin. */
export async function requireAdminPage(callbackPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(signInPath(callbackPath, await getLocale()));
  if (user.role !== "ADMIN") notFound();
  return user;
}

/**
 * Admin check from an explicit request, with no reliance on Next's request
 * context (AsyncLocalStorage). Used by the UploadThing middleware, whose
 * handler runs inside Effect fibers.
 */
export async function getAdminFromRequest(
  db: DbClient,
  request: Request,
): Promise<SessionUser | null> {
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { sessionToken: token },
    select: { expires: true, user: { select: { id: true, email: true, name: true, role: true } } },
  });
  if (!session || session.expires <= new Date() || session.user.role !== "ADMIN") return null;
  return session.user;
}
