import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileForm } from "@/components/shop/account/profile-form";
import { SignOutButton } from "@/components/shop/account/sign-out-button";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth-guards";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("profile") };
}

export default async function ProfilePage({ params }: PageProps) {
  setRequestLocale((await params).locale as Locale);
  const [t, user] = await Promise.all([getTranslations("account"), requireUser("/account")]);
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="profile-heading" className="flex flex-col gap-4">
        <h2 id="profile-heading" className="text-xl font-semibold">
          {t("profile")}
        </h2>
        <ProfileForm name={user.name ?? ""} email={user.email} />
      </section>
      <section className="flex flex-col items-start gap-3 border-t pt-6">
        <SignOutButton />
      </section>
    </div>
  );
}
