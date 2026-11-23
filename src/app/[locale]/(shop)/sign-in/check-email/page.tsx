import type { Metadata } from "next";
import { MailIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("checkEmailTitle"), robots: { index: false } };
}

export default async function CheckEmailPage({ params }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-20 text-center">
      <MailIcon className="text-primary size-10" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">{t("checkEmailTitle")}</h1>
      <p className="text-muted-foreground">{t("checkEmailBody")}</p>
    </div>
  );
}
