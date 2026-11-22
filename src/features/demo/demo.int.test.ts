import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/demo/session/route";
import { resetDatabase, testDb } from "@/test/db";
import { createDemoSession } from "./demo";
import { DEMO_ACCOUNTS } from "./rules";

const NOW = new Date("2026-11-22T12:00:00Z");

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function demoRequest(role: string, origin = "http://localhost:3100") {
  return new NextRequest("http://localhost:3100/api/demo/session", {
    method: "POST",
    headers: { origin },
    body: new URLSearchParams({ role }),
  });
}

describe("createDemoSession", () => {
  it("creates the demo admin with an ADMIN role and a two-hour session", async () => {
    const { sessionToken, expires } = await createDemoSession("admin", NOW);
    const session = await testDb.session.findUniqueOrThrow({
      where: { sessionToken },
      include: { user: true },
    });
    expect(session.user).toMatchObject({ email: DEMO_ACCOUNTS.admin.email, role: "ADMIN" });
    expect(expires.getTime() - NOW.getTime()).toBe(2 * 60 * 60 * 1000);
  });

  it("restores the admin role if the demo admin was demoted", async () => {
    await testDb.user.create({ data: { email: DEMO_ACCOUNTS.admin.email, role: "CUSTOMER" } });
    await createDemoSession("admin", NOW);
    const user = await testDb.user.findUniqueOrThrow({
      where: { email: DEMO_ACCOUNTS.admin.email },
    });
    expect(user.role).toBe("ADMIN");
  });

  it("signs in as the seeded demo customer and keeps their profile", async () => {
    await testDb.user.create({
      data: { email: DEMO_ACCOUNTS.customer.email, name: "Renamed Shopper" },
    });
    const { sessionToken } = await createDemoSession("customer", NOW);
    const session = await testDb.session.findUniqueOrThrow({
      where: { sessionToken },
      include: { user: true },
    });
    expect(session.user).toMatchObject({ name: "Renamed Shopper", role: "CUSTOMER" });
  });
});

describe("POST /api/demo/session", () => {
  it("does not exist outside demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "");
    const response = await POST(demoRequest("admin"));
    expect(response.status).toBe(404);
    expect(await testDb.session.count()).toBe(0);
  });

  it("refuses cross-origin posts", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const response = await POST(demoRequest("admin", "https://evil.example"));
    expect(response.status).toBe(403);
    expect(await testDb.session.count()).toBe(0);
  });

  it("rejects unknown roles", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    expect((await POST(demoRequest("superuser"))).status).toBe(400);
  });

  it("sets the session cookie and redirects to the admin", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const response = await POST(demoRequest("admin"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3100/admin");
    const cookie = response.cookies.get("authjs.session-token");
    expect(cookie?.httpOnly).toBe(true);
    const session = await testDb.session.findUnique({ where: { sessionToken: cookie?.value } });
    expect(session).not.toBeNull();
  });
});
