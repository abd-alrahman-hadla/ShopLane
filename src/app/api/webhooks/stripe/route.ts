import type Stripe from "stripe";
import { processStripeEvent } from "@/features/checkout/webhook";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env, getStripeEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook endpoint. The signature is verified against the raw body;
 * any processing error returns 500 so Stripe retries the delivery.
 */
export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      getStripeEnv().STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const result = await processStripeEvent(event, {
      db,
      stripe: getStripe(),
      sendEmail,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
      now: () => new Date(),
      logger: console,
    });
    return Response.json({ received: true, ...result });
  } catch (error) {
    console.error(`[webhook] ${event.type} ${event.id} failed`, error);
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
