"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { UserIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
    <div className="flex items-center gap-2">
      <span
        className="text-muted-foreground hidden max-w-40 truncate text-sm md:inline"
        title={session.user.email ?? ""}
      >
        {session.user.email}
      </span>
      <Button variant="ghost" onClick={() => void signOut({ redirectTo: "/" })}>
        Sign out
      </Button>
    </div>
  );
}
