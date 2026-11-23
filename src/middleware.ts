import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/** Locale routing: "/" is English, "/ar/..." Arabic; NEXT_LOCALE remembers the choice. */
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals, metadata routes and files with an extension.
  // (Double backslashes: the string must contain `\.` so the dot is literal.)
  matcher: ["/((?!api|_next|_vercel|sitemap\\.xml|robots\\.txt|.*\\..*).*)"],
};
