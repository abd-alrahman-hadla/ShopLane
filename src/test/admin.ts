/**
 * Shared mocks for admin integration tests. Import this module first (it calls
 * vi.mock, which Vitest hoists), then control the session with `signInAs`.
 */
import { vi } from "vitest";
import { createFakeStripe, type FakeStripe } from "./fake-stripe";

const session = vi.hoisted(() => ({
  current: null as null | {
    user: { id: string; email: string; name: string | null; role: string };
  },
}));
const emails = vi.hoisted(() => ({
  send: vi.fn(async (_message: unknown) => ({ id: "email_test" })),
}));
const stripeHolder = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/auth", () => ({ auth: async () => session.current }));
vi.mock("@/lib/email", () => ({ sendEmail: (message: unknown) => emails.send(message) }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripeHolder.current }));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

export function signInAs(
  user: { id: string; email: string; name?: string | null; role: "ADMIN" | "CUSTOMER" } | null,
): void {
  session.current = user ? { user: { ...user, name: user.name ?? null } } : null;
}

export function useFakeStripe(): FakeStripe {
  const fake = createFakeStripe();
  stripeHolder.current = fake;
  return fake;
}

export const sentEmails = emails.send;
