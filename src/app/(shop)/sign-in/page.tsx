import type { Metadata } from "next";
import { SignInForm } from "@/components/shop/account/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

type PageProps = { searchParams: Promise<{ callbackUrl?: string; error?: string }> };

export default async function SignInPage({ searchParams }: PageProps) {
  const { callbackUrl, error } = await searchParams;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm">
          We’ll email you a link to sign in. No password needed. Your cart comes with you.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          That sign-in link is invalid or has expired. Request a new one.
        </p>
      )}
      <SignInForm callbackUrl={callbackUrl?.startsWith("/") ? callbackUrl : undefined} />
    </div>
  );
}
