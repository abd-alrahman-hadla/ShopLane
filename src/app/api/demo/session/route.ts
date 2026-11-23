import { NextResponse, type NextRequest } from "next/server";
import { createDemoSession } from "@/features/demo/demo";
import {
  demoLandingPath,
  isDemoRole,
  isSameOrigin,
  sessionCookieName,
} from "@/features/demo/rules";
import { isDemoMode } from "@/lib/env";

/**
 * POST (form) → opens a session for the demo admin or demo customer and
 * redirects with 303, so the browser does a full page load with the new cookie.
 * Exists only when DEMO_MODE=true; otherwise it 404s.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isDemoMode()) return new NextResponse(null, { status: 404 });
  if (!isSameOrigin(request.headers.get("origin"), request.url)) {
    return new NextResponse("Cross-origin request refused.", { status: 403 });
  }

  const form = await request.formData();
  const role = form.get("role");
  const locale = String(form.get("locale") ?? "en");
  if (!isDemoRole(role)) return new NextResponse("Unknown demo account.", { status: 400 });

  const { sessionToken, expires } = await createDemoSession(role);
  const secure = new URL(request.url).protocol === "https:";
  const response = NextResponse.redirect(new URL(demoLandingPath(role, locale), request.url), 303);
  response.cookies.set(sessionCookieName(secure), sessionToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires,
  });
  return response;
}
