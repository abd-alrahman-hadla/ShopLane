import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import type { EmailI18n } from "./i18n";

export const emailColors = {
  background: "#faf8f5",
  card: "#ffffff",
  text: "#2b211b",
  muted: "#7a6a5e",
  primary: "#5a3e2b",
  border: "#e8e1d8",
} as const;

type EmailLayoutProps = {
  i18n: EmailI18n;
  preview: string;
  children: ReactNode;
};

const FONTS = {
  ltr: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  // Mail clients rarely load web fonts; these system fonts all have Arabic glyphs.
  rtl: "Tahoma, 'Segoe UI', 'Geeza Pro', 'Noto Sans Arabic', Arial, sans-serif",
} as const;

/** Shared shell for transactional emails, laid out in the email's language and direction. */
export function EmailLayout({ i18n, preview, children }: EmailLayoutProps) {
  const { locale, dir, t } = i18n;
  return (
    <Html lang={locale} dir={dir}>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: emailColors.background,
          color: emailColors.text,
          direction: dir,
          fontFamily: FONTS[dir],
          margin: 0,
          padding: "24px 0",
          textAlign: dir === "rtl" ? "right" : "left",
        }}
      >
        <Container
          style={{
            backgroundColor: emailColors.card,
            border: `1px solid ${emailColors.border}`,
            borderRadius: 12,
            maxWidth: 560,
            padding: "32px 28px",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 600, margin: "0 0 24px" }}>ShopLane</Text>
          <Section>{children}</Section>
          <Hr style={{ borderColor: emailColors.border, margin: "32px 0 16px" }} />
          <Text style={{ color: emailColors.muted, fontSize: 12, margin: 0 }}>{t("footer")}</Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Keeps Latin snippets (order numbers, codes, tracking) readable inside Arabic text. */
export function Ltr({ children }: { children: ReactNode }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
      {children}
    </span>
  );
}
