# Testing payments locally with the Stripe CLI

ShopLane uses Stripe Checkout in **test mode**. Payments are confirmed only by
the webhook at `/api/webhooks/stripe`, never by the browser. To test locally,
the Stripe CLI forwards webhook events from Stripe to your dev server.

## 1. One-time setup

1. **Install the Stripe CLI** (Windows):
   - With Scoop:
     ```powershell
     scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
     scoop install stripe
     ```
   - Or download `stripe_<version>_windows_x86_64.zip` from
     <https://github.com/stripe/stripe-cli/releases>, unzip it and add the folder to `PATH`.
2. **Log in** (opens the browser): `stripe login`
3. **Add your test secret key** to `.env`. It's under Dashboard → Developers → API keys, and starts with `sk_test_`:
   ```dotenv
   STRIPE_SECRET_KEY="sk_test_..."
   ```
   `src/lib/env.ts` refuses `sk_live_` keys outside production.

## 2. Run the app with webhooks forwarded

In one terminal:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe \
  --events checkout.session.completed,checkout.session.expired,charge.refunded
```

It prints `Ready! Your webhook signing secret is whsec_...`. Copy that into `.env`:

```dotenv
STRIPE_WEBHOOK_SECRET="whsec_..."
```

The secret stays the same across `stripe listen` runs for the same account.
Then, in a second terminal:

```bash
npm run dev
```

Without `RESEND_API_KEY`, emails (order confirmations, sign-in links) are
printed in the `npm run dev` terminal instead of being sent.

## 3. Make a test purchase

1. Add products to the cart. Optionally apply `WELCOME10` (10 % off) or `BREW5` ($5 off orders of $40+).
2. Click **Checkout**. You're redirected to Stripe's hosted page.
3. Pay with a test card. Use any future expiry date, any CVC and any ZIP:

   | Card number           | Result                                     |
   | --------------------- | ------------------------------------------ |
   | `4242 4242 4242 4242` | Succeeds                                   |
   | `4000 0000 0000 0002` | Declined (no webhook, order stays PENDING) |
   | `4000 0025 0000 3155` | Asks for 3-D Secure authentication         |

4. You land on `/checkout/success`. It shows **Confirming your payment…** until the
   webhook arrives, usually within a second or two, and then **Order SL-#### is confirmed**.

**What to check:**

- The `stripe listen` terminal shows `checkout.session.completed` → `[200]`.
- The order's status is `PAID` and the variant's stock went down. Check this in the Neon SQL editor:
  ```sql
  select number, status, "totalCents", "paidAt" from "Order" order by number desc limit 5;
  ```
- The confirmation email was sent, or printed in the dev terminal.

## 4. Scenarios

### Duplicate deliveries (idempotency)

Copy an event id (`evt_...`) from the `stripe listen` output and replay it:

```bash
stripe events resend evt_...
```

The response says `"outcome":"duplicate"`. Nothing changes: no second stock decrement and no second email.

### Expired checkout

Start a checkout and close the Stripe page without paying. Sessions expire after
31 minutes. To expire one immediately, use the `cs_test_...` id from the URL:

```bash
stripe checkout sessions expire cs_test_...
```

The order becomes `CANCELLED` (`cancelReason = checkout_expired`) and any coupon
redemption it reserved is released. No stock is involved, because stock only
comes off when payment succeeds.

### Refund

Refund a paid order with its payment intent id. It's in the Stripe Dashboard,
or in the `stripePaymentIntentId` column of the order:

```bash
stripe refunds create --payment-intent pi_...
```

A full refund triggers `charge.refunded`, and the order becomes `REFUNDED`.
A partial refund (`--amount 500`) is logged and leaves the status unchanged.
Refunds never restock automatically.

### Two buyers, one item left

1. Set a variant's stock to 1 in the Neon SQL editor:
   `update "Variant" set stock = 1 where sku = 'CA-CST-BLK';`
2. Open the store in two browser profiles. Add that item to both carts and click
   **Checkout** in both. Both pass the stock check.
3. Pay in both tabs.

The first payment wins. The second order's webhook can't take stock, so it
refunds that payment automatically (`out_of_stock`). The order becomes
`CANCELLED` and then `REFUNDED` once `charge.refunded` arrives, and the buyer
gets an apology email. The automated version of this is
`src/features/checkout/stock-race.int.test.ts`.

### Why `stripe trigger` is ignored

`stripe trigger checkout.session.completed` creates a session with no
`metadata.orderId`, so the webhook answers `"outcome":"ignored"`. That's useful
for checking that signatures verify, but real flows need a real checkout from the store.

## 5. Automated tests

| Command                    | What it covers                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm test`                 | Pricing, coupons, cart merging, Stripe session params (no network)                                                |
| `npm run test:integration` | Checkout, every webhook handler with fixture events, signature checks, stock and coupon races. Needs `.env.test`. |
| `npm run e2e`              | Cart drawer, coupon, redirect to Stripe                                                                           |

Integration tests need a **separate Neon branch**. Create one named `test`, copy
`.env.test.example` to `.env.test`, and apply migrations to it:

```bash
npm run db:apply:test
```

The test setup refuses to run if `TEST_DATABASE_URL` points at the dev database.

> **Note:** on this network, Postgres port 5432 to Neon is blocked, so
> `prisma migrate` and Prisma Studio can't connect. `npm run db:apply` and
> `db:apply:test` apply migrations over HTTPS (port 443) instead.
