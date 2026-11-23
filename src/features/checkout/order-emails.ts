import type { PrismaClient } from "@/generated/prisma/client";
import { emailI18n } from "@/emails/i18n";
import {
  OrderConfirmationEmail,
  OrderOutOfStockEmail,
  orderConfirmationText,
  orderOutOfStockText,
} from "@/emails/order-emails";
import type { EmailSender } from "@/lib/email";
import { localizeOrderItems } from "./email-items";
import { formatOrderNumber } from "./order-number";

type Deps = { db: PrismaClient; sendEmail: EmailSender; siteUrl: string; now: () => Date };

/** The order with its items in the language the customer shopped in. */
async function loadOrder(db: PrismaClient, orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!order) return null;
  const i18n = emailI18n(order.locale);
  const items = await localizeOrderItems(db, order.items, i18n.locale);
  return { order: { ...order, items }, i18n };
}

/** Home page in the customer's language. */
function localizedSiteUrl(siteUrl: string, locale: string): string {
  return locale === "en" ? siteUrl : `${siteUrl.replace(/\/$/, "")}/${locale}`;
}

/**
 * Sends the confirmation once. Resend's idempotency key protects against a
 * double send if the marker update fails after a successful send.
 */
export async function sendOrderConfirmation(deps: Deps, orderId: string): Promise<boolean> {
  const loaded = await loadOrder(deps.db, orderId);
  if (!loaded) return false;
  const { order, i18n } = loaded;
  if (order.status !== "PAID" || !order.email || order.confirmationEmailSentAt) return false;

  const number = formatOrderNumber(order.number);
  await deps.sendEmail({
    to: order.email,
    subject: i18n.t("confirmation.subject", { number }),
    react: OrderConfirmationEmail({
      order,
      siteUrl: localizedSiteUrl(deps.siteUrl, i18n.locale),
      i18n,
    }),
    text: orderConfirmationText(order, i18n),
    idempotencyKey: `order-confirmation/${order.id}`,
  });
  await deps.db.order.updateMany({
    where: { id: order.id, confirmationEmailSentAt: null },
    data: { confirmationEmailSentAt: deps.now() },
  });
  return true;
}

export async function sendOutOfStockNotice(deps: Deps, orderId: string): Promise<boolean> {
  const loaded = await loadOrder(deps.db, orderId);
  if (!loaded) return false;
  const { order, i18n } = loaded;
  if (order.cancelReason !== "out_of_stock" || !order.email) return false;

  await deps.sendEmail({
    to: order.email,
    subject: i18n.t("outOfStock.subject", { number: formatOrderNumber(order.number) }),
    react: OrderOutOfStockEmail({ order, i18n }),
    text: orderOutOfStockText(order, i18n),
    idempotencyKey: `order-out-of-stock/${order.id}`,
  });
  return true;
}
