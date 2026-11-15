import type { Metadata } from "next";
import { AccountNav } from "@/components/shop/account/account-nav";
import { requireUser } from "@/lib/auth-guards";

export const metadata: Metadata = {
  title: { default: "Your account", template: "%s · Your account · ShopLane" },
  robots: { index: false },
};

/** Account pages read the session, so they render dynamically (catalog pages stay static). */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Your account</h1>
        <p className="text-muted-foreground text-sm">
          {user.name ? `Hi, ${user.name}.` : user.email}
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[12rem_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
