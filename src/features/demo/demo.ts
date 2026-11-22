import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { DEMO_ACCOUNTS, DEMO_SESSION_HOURS, type DemoRole } from "./rules";

/** Upserts the demo user (keeping its role) and opens a database session for it. */
export async function createDemoSession(
  role: DemoRole,
  now: Date = new Date(),
): Promise<{ sessionToken: string; expires: Date }> {
  const account = DEMO_ACCOUNTS[role];
  const user = await db.user.upsert({
    where: { email: account.email },
    create: { email: account.email, name: account.name, role: account.role, emailVerified: now },
    // The role is re-asserted so a demo admin can never be demoted (or a customer promoted).
    update: { role: account.role },
    select: { id: true },
  });
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(now.getTime() + DEMO_SESSION_HOURS * 60 * 60 * 1000);
  await db.session.create({ data: { sessionToken, userId: user.id, expires } });
  return { sessionToken, expires };
}
