import { z } from "zod";

/**
 * Server-side environment. Import only from server modules.
 *
 * Core variables are validated on first import, so a missing DATABASE_URL
 * fails fast. Feature groups (Stripe, email, auth) are validated lazily on
 * first use, so catalog pages and tests don't need payment keys.
 */

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${formatIssues(result.error)}`);
  }
  return result.data;
}

function lazyEnv<T extends z.ZodType>(schema: T): () => z.infer<T> {
  let cached: z.infer<T> | undefined;
  return () => {
    cached ??= parseEnv(schema, process.env);
    return cached;
  };
}

const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

const serverEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  DATABASE_URL: z.url(),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  return parseEnv(serverEnvSchema, source);
}

export const env: ServerEnv = parseServerEnv(process.env);

/** Live keys are only accepted in production builds. */
export const stripeEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    STRIPE_SECRET_KEY: z.string().regex(/^sk_(test|live)_/, "must be a Stripe secret key"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  })
  .refine(
    (value) => value.NODE_ENV === "production" || value.STRIPE_SECRET_KEY.startsWith("sk_test_"),
    {
      message: "Use a test-mode key (sk_test_…) outside production",
      path: ["STRIPE_SECRET_KEY"],
    },
  );

export const getStripeEnv = lazyEnv(stripeEnvSchema);

const emailEnvSchema = z.object({
  /** Optional in development: without it, emails are logged to the console. */
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  EMAIL_FROM: z.string().min(3).default("ShopLane <onboarding@resend.dev>"),
});

export const getEmailEnv = lazyEnv(emailEnvSchema);
