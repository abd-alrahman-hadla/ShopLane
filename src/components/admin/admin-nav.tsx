"use client";

import {
  HistoryIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ReceiptIcon,
  TicketPercentIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "dashboard", icon: LayoutDashboardIcon },
  { href: "/admin/products", label: "products", icon: PackageIcon },
  { href: "/admin/orders", label: "orders", icon: ReceiptIcon },
  { href: "/admin/coupons", label: "coupons", icon: TicketPercentIcon },
  { href: "/admin/audit", label: "audit", icon: HistoryIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** Vertical on desktop, a scrollable row on mobile. */
export function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  return (
    <nav aria-label={t("label")}>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-secondary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
