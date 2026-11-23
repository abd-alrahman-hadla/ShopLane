"use client";

import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const t = useTranslations("auth");
  const locale = useLocale();
  return (
    <Button
      variant="outline"
      onClick={() => void signOut({ redirectTo: locale === "en" ? "/" : `/${locale}` })}
    >
      {t("signOut")}
    </Button>
  );
}
