import { describe, expect, it } from "vitest";
import { cooldownRemainingMs, DEMO_RESET_COOLDOWN_MS } from "./reset";

describe("cooldownRemainingMs", () => {
  const now = new Date("2026-11-22T12:00:00Z");

  it("allows a reset when there has never been one", () => {
    expect(cooldownRemainingMs(null, now)).toBe(0);
  });

  it("counts down from the last reset", () => {
    const tenSecondsAgo = new Date(now.getTime() - 10_000);
    expect(cooldownRemainingMs(tenSecondsAgo, now)).toBe(DEMO_RESET_COOLDOWN_MS - 10_000);
  });

  it("allows a reset once the cooldown has passed", () => {
    const longAgo = new Date(now.getTime() - DEMO_RESET_COOLDOWN_MS - 1);
    expect(cooldownRemainingMs(longAgo, now)).toBe(0);
  });
});
