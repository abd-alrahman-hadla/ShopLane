import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoSignIn } from "@/components/shop/account/demo-sign-in";
import { SignInForm } from "@/components/shop/account/sign-in-form";
import type { Locale } from "@/i18n/routing";
import { isDemoMode } from "@/lib/env";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("title"), robots: { index: false } };
}

export default async function SignInPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t, { callbackUrl, error }] = await Promise.all([getTranslations("auth"), searchParams]);
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("lead")}</p>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {t("linkInvalid")}
        </p>
      )}
      {isDemoMode() && <DemoSignIn />}
      <SignInForm callbackUrl={callbackUrl?.startsWith("/") ? callbackUrl : undefined} />
    </div>
  );
}
