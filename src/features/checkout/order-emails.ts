import type { PrismaClient } from "@/generated/prisma/client";
import {
  OrderConfirmationEmail,
  OrderOutOfStockEmail,
  orderConfirmationText,
  orderOutOfStockText,
} from "@/emails/order-emails";
import type { EmailSender } from "@/lib/email";
import { formatOrderNumber } from "./order-number";

type Deps = { db: PrismaClient; sendEmail: EmailSender; siteUrl: string; now: () => Date };

async function loadOrder(db: PrismaClient, orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: "asc" } } },
  });
}

/**
 * Sends the confirmation once. Resend's idempotency key protects against a
 * double send if the marker update fails after a successful send.
 */
export async function sendOrderConfirmation(deps: Deps, orderId: string): Promise<boolean> {
  const order = await loadOrder(deps.db, orderId);
  if (!order || order.status !== "PAID" || !order.email || order.confirmationEmailSentAt)
    return false;

  await deps.sendEmail({
    to: order.email,
    subject: `Order ${formatOrderNumber(order.number)} confirmed`,
    react: OrderConfirmationEmail({ order, siteUrl: deps.siteUrl }),
    text: orderConfirmationText(order),
    idempotencyKey: `order-confirmation/${order.id}`,
  });
  await deps.db.order.updateMany({
    where: { id: order.id, confirmationEmailSentAt: null },
    data: { confirmationEmailSentAt: deps.now() },
  });
  return true;
}

export async function sendOutOfStockNotice(deps: Deps, orderId: string): Promise<boolean> {
  const order = await loadOrder(deps.db, orderId);
  if (!order || order.cancelReason !== "out_of_stock" || !order.email) return false;

  await deps.sendEmail({
    to: order.email,
    subject: `Order ${formatOrderNumber(order.number)} cancelled and refunded`,
    react: OrderOutOfStockEmail({ order }),
    text: orderOutOfStockText(order),
    idempotencyKey: `order-out-of-stock/${order.id}`,
  });
  return true;
}
