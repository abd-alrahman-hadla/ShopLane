import { Button, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./layout";

type SignInLinkEmailProps = { url: string };

export function SignInLinkEmail({ url }: SignInLinkEmailProps) {
  return (
    <EmailLayout preview="Your ShopLane sign-in link">
      <Text style={{ fontSize: 16 }}>
        Click the button below to sign in. The link expires in 24 hours.
      </Text>
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
        Sign in to ShopLane
      </Button>
      <Text style={{ color: emailColors.muted, fontSize: 13 }}>
        If you didn’t request this, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

export function signInLinkText(url: string): string {
  return `Sign in to ShopLane:\n${url}\n\nThe link expires in 24 hours. If you didn't request it, ignore this email.`;
}
