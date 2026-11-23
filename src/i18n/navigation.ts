import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware replacements for next/link and next/navigation. App code uses
 * these, so links and redirects keep the current language (/ar stays /ar).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
