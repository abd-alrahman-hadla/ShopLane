import type { Metadata } from "next";
import Link from "next/link";
import { CoffeeIcon, ExternalLinkIcon } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/features/admin/guard";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · ShopLane" },
  robots: { index: false, follow: false },
};

/**
 * Admin shell. Every page and every action re-checks the role on the server;
 * this layout is only the first gate (sign-in for guests, 404 for customers).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage("/admin");
  return (
    <div className="bg-muted/30 min-h-dvh">
      <header className="bg-background sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <CoffeeIcon className="text-primary size-5" aria-hidden />
            ShopLane <span className="text-muted-foreground font-normal">Admin</span>
          </Link>
          <span className="text-muted-foreground ml-auto hidden text-sm sm:inline">
            {admin.email}
          </span>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
          >
            View store <ExternalLinkIcon className="size-3.5" aria-hidden />
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[12rem_1fr]">
        <AdminNav />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
