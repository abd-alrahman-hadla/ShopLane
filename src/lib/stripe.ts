import Stripe from "stripe";
import { getStripeEnv } from "@/lib/env";

let client: Stripe | undefined;

/** Stripe client; uses the API version pinned by the installed SDK. */
export function getStripe(): Stripe {
  client ??= new Stripe(getStripeEnv().STRIPE_SECRET_KEY, {
    appInfo: { name: "ShopLane" },
    maxNetworkRetries: 2,
  });
  return client;
}

/** The subset of the Stripe client the order flows use (easy to fake in tests). */
export type StripeGateway = {
  checkout: { sessions: Pick<Stripe["checkout"]["sessions"], "create" | "expire"> };
  coupons: Pick<Stripe["coupons"], "create">;
  refunds: Pick<Stripe["refunds"], "create">;
};
