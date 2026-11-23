"use client";

import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { DropdownMenu } from "radix-ui";
import {
  CheckIcon,
  HeartIcon,
  LanguagesIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PackageIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { getPathname, Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const itemClass =
  "data-[highlighted]:bg-accent flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 text-sm outline-none select-none";

function MenuLink({ icon, children, ...props }: ComponentProps<typeof Link> & { icon: ReactNode }) {
  return (
    <DropdownMenu.Item asChild className={itemClass}>
      <Link {...props}>
        {icon}
        {children}
      </Link>
    </DropdownMenu.Item>
  );
}

const THEMES = [
  { value: "light", icon: SunIcon },
  { value: "dark", icon: MoonIcon },
  { value: "system", icon: MonitorIcon },
] as const;

/**
 * One header menu for everything about "you": sign in or your account pages,
 * the admin (for admins), language and theme. Keeps the header to search,
 * this menu and the cart. Reads the session client-side so shop pages stay static.
 */
export function AccountMenu() {
  const { data: session, status } = useSession();
  const t = useTranslations("header");
  const tl = useTranslations("language");
  const tt = useTranslations("theme");
  const ta = useTranslations("auth");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  // No link to the admin while already in it.
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const user = session?.user;
  const otherLocale =
    routing.locales.find((candidate) => candidate !== locale) ?? routing.defaultLocale;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5")}
        // Same as the visible label (hidden on phones), so voice control can target it.
        aria-label={user ? t("account") : status === "loading" ? t("menu") : t("signIn")}
        data-testid="account-menu"
      >
        <UserIcon data-icon="inline-start" />
        {/* Width reserved for either label, so the header doesn't shift when the session loads. */}
        <span className="hidden min-w-14 sm:inline">
          {status === "loading" ? "" : user ? t("account") : t("signIn")}
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="bg-popover text-popover-foreground z-50 w-60 rounded-lg border p-1 shadow-md"
        >
          {user ? (
            <>
              <DropdownMenu.Label className="px-2 py-1.5">
                <span className="block truncate text-sm font-medium">
                  {user.name ?? user.email}
                </span>
                {user.name && (
                  <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
                )}
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="bg-border my-1 h-px" />
              <MenuLink href="/account" icon={<UserIcon className="size-4" aria-hidden />}>
                {t("account")}
              </MenuLink>
              <MenuLink
                href="/account/orders"
                icon={<PackageIcon className="size-4" aria-hidden />}
              >
                {t("orders")}
              </MenuLink>
              <MenuLink
                href="/account/wishlist"
                icon={<HeartIcon className="size-4" aria-hidden />}
              >
                {t("wishlist")}
              </MenuLink>
              {user.role === "ADMIN" && !inAdmin && (
                // A full page load on purpose: the first client-side navigation
                // from the store into /admin never commits on Next 15.5 (the
                // request completes but the transition stays pending).
                // /admin re-checks the role on the server.
                <DropdownMenu.Item asChild className={itemClass}>
                  <a href={getPathname({ href: "/admin", locale })} data-testid="admin-link">
                    <LayoutDashboardIcon className="size-4" aria-hidden />
                    {t("admin")}
                  </a>
                </DropdownMenu.Item>
              )}
            </>
          ) : (
            <MenuLink
              href={`/sign-in?callbackUrl=${encodeURIComponent(getPathname({ href: pathname, locale }))}`}
              icon={<LogInIcon className="size-4" aria-hidden />}
            >
              {t("signIn")}
            </MenuLink>
          )}

          <DropdownMenu.Separator className="bg-border my-1 h-px" />
          <DropdownMenu.Item
            className={itemClass}
            lang={otherLocale}
            data-testid="language-switcher"
            onSelect={() =>
              router.replace(`${pathname}${window.location.search}`, {
                locale: otherLocale,
                scroll: false,
              })
            }
          >
            <LanguagesIcon className="size-4" aria-hidden />
            {tl(otherLocale)}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="bg-border my-1 h-px" />
          <DropdownMenu.Label className="text-muted-foreground px-2 pt-1 pb-0.5 text-xs">
            {tt("toggle")}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme ?? "system"} onValueChange={setTheme}>
            {THEMES.map(({ value, icon: Icon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className={itemClass}
                data-testid={`theme-${value}`}
              >
                <Icon className="size-4" aria-hidden />
                <span className="flex-1">{tt(value)}</span>
                <DropdownMenu.ItemIndicator>
                  <CheckIcon className="size-4" aria-hidden />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          {user && (
            <>
              <DropdownMenu.Separator className="bg-border my-1 h-px" />
              <DropdownMenu.Item
                className={itemClass}
                onSelect={() => void signOut({ redirectTo: getPathname({ href: "/", locale }) })}
              >
                <LogOutIcon className="size-4" aria-hidden />
                {ta("signOut")}
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
