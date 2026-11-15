import type Stripe from "stripe";
import { vi } from "vitest";
import type { StripeGateway } from "@/lib/stripe";

type RequestOptions = { idempotencyKey?: string };

let counter = 0;

/**
 * In-memory stand-in for the parts of the Stripe client the order flows use.
 * Calls are recorded so tests can assert on them.
 */
export function createFakeStripe() {
  return {
    coupons: {
      create: vi.fn(async (params: Stripe.CouponCreateParams, _options?: RequestOptions) => ({
        id: `co_test_${++counter}`,
        ...params,
      })),
    },
    checkout: {
      sessions: {
        create: vi.fn(
          async (_params: Stripe.Checkout.SessionCreateParams, _options?: RequestOptions) => {
            const id = `cs_test_${++counter}`;
            return {
              id,
              url: `https://checkout.stripe.com/c/pay/${id}`,
              expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
            };
          },
        ),
        expire: vi.fn(),
      },
    },
    refunds: {
      create: vi.fn(async (params: Stripe.RefundCreateParams, _options?: RequestOptions) => ({
        id: `re_test_${++counter}`,
        payment_intent: params.payment_intent,
        status: "succeeded",
      })),
    },
  };
}

export type FakeStripe = ReturnType<typeof createFakeStripe>;

/** The fake implements only the calls the order flows make. */
export function asStripeGateway(fake: FakeStripe): StripeGateway {
  return fake as unknown as StripeGateway;
}
