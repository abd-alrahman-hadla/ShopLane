"use client";

import Link from "next/link";
import { IntentLink } from "@/components/intent-link";
import { useSession } from "next-auth/react";
import { HeartIcon, LayoutDashboardIcon, UserIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Reads the session client-side so shop pages can stay statically rendered. */
export function AccountMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="bg-muted inline-block h-8 w-16 animate-pulse rounded-lg" aria-hidden />;
  }

  if (!session?.user) {
    return (
      <IntentLink
        href="/sign-in"
        aria-label="Sign in"
        className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5")}
      >
        <UserIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Sign in</span>
      </IntentLink>
    );
  }

  return (
    <div className="flex items-center">
      {/* Convenience only: /admin re-checks the role on the server. */}
      {session.user.role === "ADMIN" && (
        <Link
          href="/admin"
          aria-label="Admin"
          className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5")}
          data-testid="admin-link"
        >
          <LayoutDashboardIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      )}
      <Link
        href="/account/wishlist"
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        aria-label="Wishlist"
      >
        <HeartIcon />
      </Link>
      <Link
        href="/account"
        aria-label="Account"
        className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5")}
      >
        <UserIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Account</span>
      </Link>
    </div>
  );
}
