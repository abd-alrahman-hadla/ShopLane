import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatMoney, formatNumber, formatPercent } from "./format";

const NOV_22 = new Date("2026-11-22T15:30:00Z");

describe("formatMoney", () => {
  it("formats cents per locale with Latin digits", () => {
    expect(formatMoney(1850, "en")).toBe("$18.50");
    const arabic = formatMoney(1850, "ar");
    expect(arabic).toContain("18.50");
    expect(arabic).toContain("$");
    expect(arabic).not.toContain("US");
    expect(formatCurrency(1500, "ar", "usd", { notation: "compact" })).not.toContain("US");
  });

  it("rejects fractional cents", () => {
    expect(() => formatMoney(10.5, "en")).toThrow(TypeError);
  });
});

describe("formatDate", () => {
  it("uses the store time zone and month names", () => {
    expect(formatDate(NOV_22, "en")).toBe("Nov 22, 2026");
    expect(formatDate(NOV_22, "ar")).toMatch(/22/);
    expect(formatDate(NOV_22, "ar")).toMatch(/[\u0600-\u06FF]/);
    expect(formatDate(NOV_22.toISOString(), "en", "dayMonth")).toBe("Nov 22");
  });
});

describe("numbers", () => {
  it("formats plain numbers and signed percentages", () => {
    expect(formatNumber(1234, "en")).toBe("1,234");
    expect(formatNumber(1234, "ar")).toContain("1");
    expect(formatPercent(0.125, "en")).toBe("+12.5%");
    expect(formatPercent(0, "en")).toBe("0%");
  });
});
