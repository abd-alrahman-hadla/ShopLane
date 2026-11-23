import { Button, Text } from "@react-email/components";
import type { EmailI18n } from "./i18n";
import { EmailLayout, emailColors } from "./layout";

type SignInLinkEmailProps = { url: string; i18n: EmailI18n };

export function SignInLinkEmail({ url, i18n }: SignInLinkEmailProps) {
  const { t } = i18n;
  return (
    <EmailLayout i18n={i18n} preview={t("signIn.subject")}>
      <Text style={{ fontSize: 16 }}>{t("signIn.body")}</Text>
      <Button
        href={url}
        style={{
          backgroundColor: emailColors.primary,
          borderRadius: 8,
          color: "#ffffff",
          display: "inline-block",
          fontWeight: 600,
          padding: "12px 20px",
        }}
      >
        {t("signIn.cta")}
      </Button>
      <Text style={{ color: emailColors.muted, fontSize: 13 }}>{t("signIn.ignore")}</Text>
    </EmailLayout>
  );
}

export function signInLinkText(url: string, i18n: EmailI18n): string {
  return i18n.t("signIn.text", { url });
}
