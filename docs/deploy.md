# Deploying ShopLane (Vercel + Neon, Stripe test mode)

The public deployment is a **demo**. `DEMO_MODE=true` adds one-click "Demo admin" and "Demo customer" buttons to `/sign-in`. The app refuses to start Stripe with a live key while demo mode is on.

You need accounts at Vercel, Neon, Stripe (test mode) and, optionally, Resend and UploadThing. Allow about 20 minutes.

## 1. Neon: production database

1. In your Neon project, use the **default branch** (usually `main`) as production. Keep your `dev` branch for local work.
2. Under **Connect**, copy two connection strings for the production branch:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL`
   - **Direct** (no `-pooler`) → `DIRECT_URL`
3. Note the **database name** and **role**, e.g. `shoplane` / `neondb_owner`. CI needs them.
4. Under **Project settings**, copy the **Project ID**.

Migrations run automatically on every Vercel build (`vercel-build` → `prisma migrate deploy`). Vercel can reach Postgres on port 5432, unlike the dev machine.

## 2. Stripe: test-mode webhook

1. Open the Stripe Dashboard and make sure **Test mode** is on.
2. Go to **Developers → API keys** and copy the **Secret key** (`sk_test_…`).
3. Go to **Developers → Webhooks → Add endpoint**:
   - URL: `https://<your-vercel-domain>/api/webhooks/stripe` (you get the domain in step 3; you can add the endpoint afterwards)
   - Events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
4. Open the endpoint and copy its **Signing secret** (`whsec_…`).

## 3. Vercel: project and environment variables

1. Go to **Add New → Project**, import `abd-alrahman-hadla/ShopLane`, and keep the Next.js preset. Vercel picks up the `vercel-build` script automatically.
2. Add these **environment variables** to Production (and Preview if you want working previews):

   | Variable                | Value                                                                                      |
   | ----------------------- | ------------------------------------------------------------------------------------------ |
   | `DATABASE_URL`          | Neon pooled URL (production branch)                                                        |
   | `DIRECT_URL`            | Neon direct URL (production branch)                                                        |
   | `NEXT_PUBLIC_SITE_URL`  | `https://<your-vercel-domain>`                                                             |
   | `AUTH_SECRET`           | output of `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
   | `STRIPE_SECRET_KEY`     | `sk_test_…`                                                                                |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint                                                        |
   | `DEMO_MODE`             | `true`                                                                                     |
   | `EMAIL_FROM`            | `ShopLane <onboarding@resend.dev>` (or your verified domain)                               |
   | `RESEND_API_KEY`        | optional. Without it, emails are only logged (the demo buttons don't need email).          |
   | `UPLOADTHING_TOKEN`     | optional. Without it, admins add images by URL.                                            |

3. Deploy. If you used a placeholder for `NEXT_PUBLIC_SITE_URL`, set the real domain and redeploy, then finish step 2.3.

## 4. Seed the production catalog (once)

Pick one of these:

- **From GitHub (recommended).** Add the secret `DEMO_DATABASE_URL` (the Neon **pooled** production URL) and the variable `DEMO_RESET_ENABLED=true`. Then run **Actions → Demo reset → Run workflow**. The same workflow then runs nightly at 04:17 UTC and puts the catalog, stock and coupons back.
- **From your machine.** Run `DEMO_MODE=true DATABASE_URL="<pooled production URL>" npm run demo:reset`. The seed uses port 443, so it works on the dev network.

The storefront's cached pages refresh within an hour of a seed. Redeploy if you want them right away.

## 5. GitHub: CI secrets and variables

Go to **Settings → Secrets and variables → Actions**.

| Kind     | Name                 | Value                                                    |
| -------- | -------------------- | -------------------------------------------------------- |
| Secret   | `NEON_API_KEY`       | Neon → Account settings → API keys                       |
| Secret   | `STRIPE_SECRET_KEY`  | the same `sk_test_…`. Enables the real-payment e2e test. |
| Variable | `NEON_PROJECT_ID`    | from step 1.4. Without it the e2e job is skipped.        |
| Variable | `NEON_DATABASE_NAME` | e.g. `shoplane`                                          |
| Variable | `NEON_ROLE_NAME`     | e.g. `neondb_owner`                                      |
| Secret   | `DEMO_DATABASE_URL`  | step 4 (demo reset)                                      |
| Variable | `DEMO_RESET_ENABLED` | `true` (demo reset)                                      |
| Variable | `SEED_ADMIN_EMAIL`   | optional: your email, made admin by the seed             |

Each CI run creates two throwaway Neon branches (`ci-<run>-int`, `ci-<run>-e2e`) from the default branch and deletes them at the end.

## 6. Smoke test

1. `https://<domain>/robots.txt` allows `/` and links the sitemap. Previews return `Disallow: /`.
2. `https://<domain>/sitemap.xml` lists the categories and the 38 active products.
3. On `/sign-in`, **Demo customer** opens Jamie's order history. **Demo admin** opens the dashboard.
4. Buy something with `4242 4242 4242 4242` (any future date and CVC). The success page turns to "Thank you!". The order then appears in the account and in **Admin → Orders**, and the Stripe Dashboard shows a delivered webhook.
5. Run Lighthouse against production: `npm run lighthouse -- --url https://<domain>`. This updates `docs/lighthouse/scores.json`.
