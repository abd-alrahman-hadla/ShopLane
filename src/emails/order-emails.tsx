import { Button, Column, Row, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { formatMoney } from "@/lib/format";
import type { EmailI18n } from "./i18n";
import { EmailLayout, Ltr, emailColors } from "./layout";

export type OrderEmailData = {
  number: number;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  couponCode: string | null;
  /** Names and variant titles already in the email's language. */
  items: Array<{
    productName: string;
    variantTitle: string;
    quantity: number;
    lineTotalCents: number;
  }>;
};

const tags = {
  strong: (chunks: ReactNode) => (
    <strong>
      <Ltr>{chunks}</Ltr>
    </strong>
  ),
  ltr: (chunks: ReactNode) => <Ltr>{chunks}</Ltr>,
};

function SummaryRow({
  label,
  value,
  bold = false,
  dir,
}: {
  label: string;
  value: string;
  bold?: boolean;
  dir: "ltr" | "rtl";
}) {
  return (
    <Row>
      <Column>
        <Text style={{ margin: "4px 0", fontWeight: bold ? 600 : 400 }}>{label}</Text>
      </Column>
      <Column align={dir === "rtl" ? "left" : "right"}>
        <Text style={{ margin: "4px 0", fontWeight: bold ? 600 : 400 }}>{value}</Text>
      </Column>
    </Row>
  );
}

function OrderSummary({ order, i18n }: { order: OrderEmailData; i18n: EmailI18n }) {
  const { locale, dir, t } = i18n;
  const money = (cents: number) => formatMoney(cents, locale, order.currency);
  return (
    <Section style={{ borderTop: `1px solid ${emailColors.border}`, marginTop: 16, paddingTop: 8 }}>
      {order.items.map((item, index) => (
        <SummaryRow
          key={index}
          dir={dir}
          label={t("summary.line", {
            quantity: item.quantity,
            name: item.productName,
            variant: item.variantTitle,
          })}
          value={money(item.lineTotalCents)}
        />
      ))}
      <Section
        style={{ borderTop: `1px solid ${emailColors.border}`, marginTop: 8, paddingTop: 8 }}
      >
        <SummaryRow dir={dir} label={t("summary.subtotal")} value={money(order.subtotalCents)} />
        {order.discountCents > 0 && (
          <SummaryRow
            dir={dir}
            label={
              order.couponCode
                ? t("summary.discountWithCode", { code: order.couponCode })
                : t("summary.discount")
            }
            value={`−${money(order.discountCents)}`}
          />
        )}
        <SummaryRow
          dir={dir}
          label={t("summary.shipping")}
          value={order.shippingCents === 0 ? t("summary.free") : money(order.shippingCents)}
        />
        <SummaryRow dir={dir} label={t("summary.total")} value={money(order.totalCents)} bold />
      </Section>
    </Section>
  );
}

export function OrderConfirmationEmail({
  order,
  siteUrl,
  i18n,
}: {
  order: OrderEmailData;
  siteUrl: string;
  i18n: EmailI18n;
}) {
  const { t } = i18n;
  const number = formatOrderNumber(order.number);
  return (
    <EmailLayout i18n={i18n} preview={t("confirmation.subject", { number })}>
      <Text style={{ fontSize: 20, fontWeight: 600 }}>{t("confirmation.heading")}</Text>
      <Text>
        {t.rich("confirmation.body", {
          number,
          ...tags,
        })}
      </Text>
      <OrderSummary order={order} i18n={i18n} />
      <Button
        href={siteUrl}
        style={{
          backgroundColor: emailColors.primary,
          borderRadius: 8,
          color: "#ffffff",
          display: "inline-block",
          fontWeight: 600,
          marginTop: 24,
          padding: "12px 20px",
        }}
      >
        {t("confirmation.cta")}
      </Button>
    </EmailLayout>
  );
}

export function OrderOutOfStockEmail({ order, i18n }: { order: OrderEmailData; i18n: EmailI18n }) {
  const { locale, t } = i18n;
  const number = formatOrderNumber(order.number);
  return (
    <EmailLayout i18n={i18n} preview={t("outOfStock.preview", { number })}>
      <Text style={{ fontSize: 20, fontWeight: 600 }}>{t("outOfStock.heading")}</Text>
      <Text>
        {t.rich("outOfStock.body", {
          number,
          amount: formatMoney(order.totalCents, locale, order.currency),
          ...tags,
        })}
      </Text>
      <OrderSummary order={order} i18n={i18n} />
    </EmailLayout>
  );
}

function summaryText(order: OrderEmailData, i18n: EmailI18n): string {
  const { locale, t } = i18n;
  const money = (cents: number) => formatMoney(cents, locale, order.currency);
  const lines = order.items.map(
    (item) =>
      `${t("summary.line", { quantity: item.quantity, name: item.productName, variant: item.variantTitle })}  ${money(item.lineTotalCents)}`,
  );
  return [
    ...lines,
    "",
    `${t("summary.subtotal")}  ${money(order.subtotalCents)}`,
    ...(order.discountCents > 0
      ? [`${t("summary.discount")}  −${money(order.discountCents)}`]
      : []),
    `${t("summary.shipping")}  ${order.shippingCents === 0 ? t("summary.free") : money(order.shippingCents)}`,
    `${t("summary.total")}  ${money(order.totalCents)}`,
  ].join("\n");
}

export function orderConfirmationText(order: OrderEmailData, i18n: EmailI18n): string {
  const number = formatOrderNumber(order.number);
  return `${i18n.t("confirmation.text", { number })}\n\n${summaryText(order, i18n)}`;
}

export function orderOutOfStockText(order: OrderEmailData, i18n: EmailI18n): string {
  const { locale, t } = i18n;
  const text = t("outOfStock.text", {
    number: formatOrderNumber(order.number),
    amount: formatMoney(order.totalCents, locale, order.currency),
  });
  return `${text}\n\n${summaryText(order, i18n)}`;
}
