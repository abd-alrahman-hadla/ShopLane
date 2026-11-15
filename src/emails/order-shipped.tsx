import { Button, Text } from "@react-email/components";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { EmailLayout, emailColors } from "./layout";

export type ShippedEmailData = {
  number: number;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  items: Array<{ productName: string; variantTitle: string; quantity: number }>;
};

export function OrderShippedEmail({ order }: { order: ShippedEmailData }) {
  const number = formatOrderNumber(order.number);
  return (
    <EmailLayout preview={`Order ${number} is on its way`}>
      <Text style={{ fontSize: 20, fontWeight: 600 }}>Your order is on its way</Text>
      <Text>
        Order <strong>{number}</strong> shipped with {order.carrier}. Tracking number:{" "}
        <strong>{order.trackingNumber}</strong>.
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
          Track your package
        </Button>
      )}
      <Text style={{ color: emailColors.muted, marginTop: 24 }}>
        {order.items
          .map((item) => `${item.quantity} × ${item.productName} (${item.variantTitle})`)
          .join(", ")}
      </Text>
    </EmailLayout>
  );
}

export function orderShippedText(order: ShippedEmailData): string {
  const number = formatOrderNumber(order.number);
  return [
    `Order ${number} shipped with ${order.carrier}.`,
    `Tracking number: ${order.trackingNumber}`,
    ...(order.trackingUrl ? [`Track it: ${order.trackingUrl}`] : []),
  ].join("\n");
}
