/**
 * Stripe webhook fixtures. The JSON files mirror real payloads for the pinned
 * API version (trimmed to the fields ShopLane reads); these builders fill in
 * IDs so each test gets distinct events.
 */
import type Stripe from "stripe";
import chargeRefunded from "./charge.refunded.json";
import sessionCompleted from "./checkout.session.completed.json";
import sessionExpired from "./checkout.session.expired.json";

let counter = 0;

function uniqueId(prefix: string): string {
  counter += 1;
  return `${prefix}_fixture_${Date.now().toString(36)}_${counter}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

type SessionOptions = {
  orderId: string;
  eventId?: string;
  sessionId?: string;
  paymentIntentId?: string;
  amountTotal?: number;
  email?: string;
  paymentStatus?: "paid" | "unpaid" | "no_payment_required";
};

export function checkoutSessionCompletedEvent(options: SessionOptions): Stripe.Event {
  const event = clone(sessionCompleted);
  const session = event.data.object;
  event.id = options.eventId ?? uniqueId("evt");
  session.id = options.sessionId ?? uniqueId("cs_test");
  session.client_reference_id = options.orderId;
  session.metadata.orderId = options.orderId;
  session.payment_intent = options.paymentIntentId ?? uniqueId("pi");
  session.payment_status = options.paymentStatus ?? "paid";
  if (options.amountTotal !== undefined) session.amount_total = options.amountTotal;
  if (options.email !== undefined) session.customer_details.email = options.email;
  return event as unknown as Stripe.Event;
}

export function checkoutSessionExpiredEvent(options: {
  orderId: string;
  eventId?: string;
}): Stripe.Event {
  const event = clone(sessionExpired);
  event.id = options.eventId ?? uniqueId("evt");
  event.data.object.id = uniqueId("cs_test");
  event.data.object.client_reference_id = options.orderId;
  event.data.object.metadata.orderId = options.orderId;
  return event as unknown as Stripe.Event;
}

export function chargeRefundedEvent(options: {
  paymentIntentId: string;
  amount: number;
  amountRefunded?: number;
  eventId?: string;
}): Stripe.Event {
  const event = clone(chargeRefunded);
  const charge = event.data.object;
  const refunded = options.amountRefunded ?? options.amount;
  event.id = options.eventId ?? uniqueId("evt");
  charge.id = uniqueId("ch");
  charge.payment_intent = options.paymentIntentId;
  charge.amount = options.amount;
  charge.amount_captured = options.amount;
  charge.amount_refunded = refunded;
  charge.refunded = refunded >= options.amount;
  return event as unknown as Stripe.Event;
}
