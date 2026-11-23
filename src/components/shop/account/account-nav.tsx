"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "profile" },
  { href: "/account/orders", label: "orders" },
  { href: "/account/addresses", label: "addresses" },
  { href: "/account/wishlist", label: "wishlist" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/account"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** Side nav on desktop, scrollable tabs on mobile. */
export function AccountNav() {
  const pathname = usePathname();
  const t = useTranslations("account");
  return (
    <nav aria-label={t("nav")}>
      <ul className="flex gap-1 overflow-x-auto border-b pb-2 lg:flex-col lg:border-b-0 lg:pb-0">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-secondary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {t(link.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
