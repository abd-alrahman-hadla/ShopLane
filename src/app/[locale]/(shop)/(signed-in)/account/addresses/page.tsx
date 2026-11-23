import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddAddress } from "@/components/shop/account/add-address";
import { AddressCard } from "@/components/shop/account/address-card";
import { listAddresses } from "@/features/addresses/addresses";
import { MAX_ADDRESSES } from "@/features/addresses/schemas";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "addresses" });
  return { title: t("title") };
}

export default async function AddressesPage({ params }: PageProps) {
  setRequestLocale((await params).locale as Locale);
  const [t, user] = await Promise.all([
    getTranslations("addresses"),
    requireUser("/account/addresses"),
  ]);
  const addresses = await listAddresses(db, user.id);

  return (
    <section aria-labelledby="addresses-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="addresses-heading" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("lead", { max: MAX_ADDRESSES })}</p>
      </div>
      {addresses.length === 0 && <p className="text-muted-foreground text-sm">{t("none")}</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <AddressCard key={address.id} address={address} isDefault={address.isDefault} />
        ))}
      </ul>
      <AddAddress disabled={addresses.length >= MAX_ADDRESSES} />
    </section>
  );
}
