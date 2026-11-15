import type { Metadata } from "next";
import { MailIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Check your email",
  robots: { index: false },
};

export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-20 text-center">
      <MailIcon className="text-primary size-10" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
      <p className="text-muted-foreground">
        We sent you a sign-in link. Open it on this device to finish signing in.
      </p>
    </div>
  );
}
