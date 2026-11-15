"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { HeartIcon, UserIcon } from "lucide-react";
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
      <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5")}>
        <UserIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center">
      <Link
        href="/account/wishlist"
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        aria-label="Wishlist"
      >
        <HeartIcon />
      </Link>
      <Link href="/account" className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5")}>
        <UserIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Account</span>
      </Link>
    </div>
  );
}
