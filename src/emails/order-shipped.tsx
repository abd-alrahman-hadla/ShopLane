import { Button, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { formatOrderNumber } from "@/features/checkout/order-number";
import type { EmailI18n } from "./i18n";
import { EmailLayout, Ltr, emailColors } from "./layout";

export type ShippedEmailData = {
  number: number;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  /** Names and variant titles already in the email's language. */
  items: Array<{ productName: string; variantTitle: string; quantity: number }>;
};

const tags = {
  strong: (chunks: ReactNode) => (
    <strong>
      <Ltr>{chunks}</Ltr>
    </strong>
  ),
  ltr: (chunks: ReactNode) => <Ltr>{chunks}</Ltr>,
};

export function OrderShippedEmail({ order, i18n }: { order: ShippedEmailData; i18n: EmailI18n }) {
  const { t } = i18n;
  const number = formatOrderNumber(order.number);
  return (
    <EmailLayout i18n={i18n} preview={t("shipped.preview", { number })}>
      <Text style={{ fontSize: 20, fontWeight: 600 }}>{t("shipped.heading")}</Text>
      <Text>
        {t.rich("shipped.body", {
          number,
          carrier: order.carrier,
          tracking: order.trackingNumber,
          ...tags,
        })}
      </Text>
      {order.trackingUrl && (
        <Button
          href={order.trackingUrl}
          style={{
            backgroundColor: emailColors.primary,
            borderRadius: 8,
            color: "#ffffff",
            display: "inline-block",
            fontWeight: 600,
            padding: "12px 20px",
          }}
        >
          {t("shipped.cta")}
        </Button>
      )}
      <Text style={{ color: emailColors.muted, marginTop: 24 }}>
        {order.items
          .map((item) =>
            t("summary.line", {
              quantity: item.quantity,
              name: item.productName,
              variant: item.variantTitle,
            }),
          )
          .join(t("listSeparator"))}
      </Text>
    </EmailLayout>
  );
}

export function orderShippedText(order: ShippedEmailData, i18n: EmailI18n): string {
  const { t } = i18n;
  const number = formatOrderNumber(order.number);
  return [
    t("shipped.textShipped", { number, carrier: order.carrier }),
    t("shipped.textTracking", { tracking: order.trackingNumber }),
    ...(order.trackingUrl ? [t("shipped.textTrack", { url: order.trackingUrl })] : []),
  ].join("\n");
}
