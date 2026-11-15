import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { checkoutSessionExpiredEvent } from "@/features/checkout/__fixtures__/stripe-events";
import { createVariant, resetDatabase, testDb } from "@/test/db";
import { createPendingTestOrder } from "@/test/orders";
import { POST } from "./route";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const stripe = new Stripe("sk_test_signing_only");

function signedRequest(payload: string, secret: string = WEBHOOK_SECRET): Request {
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
}

beforeEach(async () => {
  await resetDatabase();
});

describe("POST /api/webhooks/stripe", () => {
  it("accepts a correctly signed event and processes it", async () => {
    const variant = await createVariant({ stock: 5 });
    const order = await createPendingTestOrder({ items: [{ variantId: variant.id, quantity: 1 }] });
    const payload = JSON.stringify(checkoutSessionExpiredEvent({ orderId: order.id }));

    const response = await POST(signedRequest(payload));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      received: true,
      outcome: "cancelled",
      orderId: order.id,
    });
    expect((await testDb.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      "CANCELLED",
    );
  });

  it("rejects a signature made with the wrong secret", async () => {
    const payload = JSON.stringify(checkoutSessionExpiredEvent({ orderId: "x" }));
    const response = await POST(signedRequest(payload, "whsec_wrong_secret"));
    expect(response.status).toBe(400);
    expect(await testDb.stripeEvent.count()).toBe(0);
  });

  it("rejects a payload altered after signing", async () => {
    const payload = JSON.stringify(checkoutSessionExpiredEvent({ orderId: "x" }));
    const request = signedRequest(payload);
    const tampered = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: payload.replace('"x"', '"y"'),
    });
    expect((await POST(tampered)).status).toBe(400);
  });

  it("rejects requests without a signature header", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/webhooks/stripe", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(400);
  });
});
