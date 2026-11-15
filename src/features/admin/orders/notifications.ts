import { OrderShippedEmail, orderShippedText } from "@/emails/order-shipped";
import { formatOrderNumber } from "@/features/checkout/order-number";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { trackingUrl } from "./transitions";

/**
 * Emails the customer their tracking details. Keyed by tracking number, so a
 * corrected tracking number sends a new email but a retry never duplicates one.
 */
export async function sendShippedNotice(orderId: string): Promise<boolean> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (
    !order ||
    order.status !== "SHIPPED" ||
    !order.email ||
    !order.trackingNumber ||
    !order.trackingCarrier
  ) {
    return false;
  }
  const data = {
    number: order.number,
    carrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: trackingUrl(order.trackingCarrier, order.trackingNumber),
    items: order.items,
  };
  await sendEmail({
    to: order.email,
    subject: `Order ${formatOrderNumber(order.number)} has shipped`,
    react: OrderShippedEmail({ order: data }),
    text: orderShippedText(data),
    idempotencyKey: `order-shipped/${order.id}/${order.trackingNumber}`,
  });
  await db.order.update({ where: { id: order.id }, data: { shippingEmailSentAt: new Date() } });
  return true;
}
