import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

export const emailColors = {
  background: "#faf8f5",
  card: "#ffffff",
  text: "#2b211b",
  muted: "#7a6a5e",
  primary: "#5a3e2b",
  border: "#e8e1d8",
} as const;

type EmailLayoutProps = {
  preview: string;
  children: ReactNode;
};

/** Shared shell for transactional emails. */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: emailColors.background,
          color: emailColors.text,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          margin: 0,
          padding: "24px 0",
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
          <Text style={{ color: emailColors.muted, fontSize: 12, margin: 0 }}>
            ShopLane · Small-batch coffee and brewing gear
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
