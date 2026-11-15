import { Button, Column, Row, Section, Text } from "@react-email/components";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { formatCents } from "@/lib/money";
import { EmailLayout, emailColors } from "./layout";

export type OrderEmailData = {
  number: number;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  couponCode: string | null;
  items: Array<{
    productName: string;
    variantTitle: string;
    quantity: number;
    lineTotalCents: number;
  }>;
};

function SummaryRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <Row>
      <Column>
        <Text style={{ margin: "4px 0", fontWeight: bold ? 600 : 400 }}>{label}</Text>
      </Column>
      <Column align="right">
        <Text style={{ margin: "4px 0", fontWeight: bold ? 600 : 400 }}>{value}</Text>
      </Column>
    </Row>
  );
}

function OrderSummary({ order }: { order: OrderEmailData }) {
  const money = (cents: number) => formatCents(cents, order.currency);
  return (
    <Section style={{ borderTop: `1px solid ${emailColors.border}`, marginTop: 16, paddingTop: 8 }}>
      {order.items.map((item, index) => (
        <SummaryRow
          key={index}
          label={`${item.quantity} × ${item.productName} (${item.variantTitle})`}
          value={money(item.lineTotalCents)}
        />
      ))}
      <Section
        style={{ borderTop: `1px solid ${emailColors.border}`, marginTop: 8, paddingTop: 8 }}
      >
        <SummaryRow label="Subtotal" value={money(order.subtotalCents)} />
        {order.discountCents > 0 && (
          <SummaryRow
            label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
            value={`−${money(order.discountCents)}`}
          />
        )}
        <SummaryRow
          label="Shipping"
          value={order.shippingCents === 0 ? "Free" : money(order.shippingCents)}
        />
        <SummaryRow label="Total" value={money(order.totalCents)} bold />
      </Section>
    </Section>
  );
}

export function OrderConfirmationEmail({
  order,
  siteUrl,
}: {
  order: OrderEmailData;
  siteUrl: string;
}) {
  const number = formatOrderNumber(order.number);
  return (
    <EmailLayout preview={`Order ${number} confirmed`}>
      <Text style={{ fontSize: 20, fontWeight: 600 }}>Thanks for your order!</Text>
      <Text>
        We’ve received your payment for order <strong>{number}</strong>. We roast on Tuesdays and
        ship within 2 business days. You’ll get another email when it’s on its way.
      </Text>
      <OrderSummary order={order} />
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
        Visit ShopLane
      </Button>
    </EmailLayout>
  );
}

export function OrderOutOfStockEmail({ order }: { order: OrderEmailData }) {
  const number = formatOrderNumber(order.number);
  return (
    <EmailLayout preview={`We couldn’t fulfil order ${number}, refund issued`}>
      <Text style={{ fontSize: 20, fontWeight: 600 }}>Sorry, we sold out</Text>
      <Text>
        Another customer bought the last of an item in order <strong>{number}</strong> moments
        before your payment went through. We’ve cancelled the order and refunded{" "}
        {formatCents(order.totalCents, order.currency)} in full. Refunds usually reach your card
        within 5–10 business days.
      </Text>
      <OrderSummary order={order} />
    </EmailLayout>
  );
}

function summaryText(order: OrderEmailData): string {
  const money = (cents: number) => formatCents(cents, order.currency);
  const lines = order.items.map(
    (item) =>
      `${item.quantity} × ${item.productName} (${item.variantTitle})  ${money(item.lineTotalCents)}`,
  );
  return [
    ...lines,
    "",
    `Subtotal  ${money(order.subtotalCents)}`,
    ...(order.discountCents > 0 ? [`Discount  −${money(order.discountCents)}`] : []),
    `Shipping  ${order.shippingCents === 0 ? "Free" : money(order.shippingCents)}`,
    `Total     ${money(order.totalCents)}`,
  ].join("\n");
}

export function orderConfirmationText(order: OrderEmailData): string {
  return `Thanks for your order ${formatOrderNumber(order.number)}!\n\n${summaryText(order)}`;
}

export function orderOutOfStockText(order: OrderEmailData): string {
  return `Sorry, we couldn't fulfil order ${formatOrderNumber(order.number)}: an item sold out just before your payment completed. You have been refunded ${formatCents(order.totalCents, order.currency)} in full.\n\n${summaryText(order)}`;
}
