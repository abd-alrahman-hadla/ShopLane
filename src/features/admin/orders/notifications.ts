import { emailI18n } from "@/emails/i18n";
import { OrderShippedEmail, orderShippedText } from "@/emails/order-shipped";
import { localizeOrderItems } from "@/features/checkout/email-items";
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
  const i18n = emailI18n(order.locale);
  const data = {
    number: order.number,
    carrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: trackingUrl(order.trackingCarrier, order.trackingNumber),
    items: await localizeOrderItems(db, order.items, i18n.locale),
  };
  await sendEmail({
    to: order.email,
    subject: i18n.t("shipped.subject", { number: formatOrderNumber(order.number) }),
    react: OrderShippedEmail({ order: data, i18n }),
    text: orderShippedText(data, i18n),
    idempotencyKey: `order-shipped/${order.id}/${order.trackingNumber}`,
  });
  await db.order.update({ where: { id: order.id }, data: { shippingEmailSentAt: new Date() } });
  return true;
}
