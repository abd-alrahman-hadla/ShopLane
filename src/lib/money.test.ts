import { describe, expect, it } from "vitest";
import { centsToWholeUnits, formatCents, unitsToCents } from "./money";

describe("formatCents", () => {
  it("formats cents as USD by default", () => {
    expect(formatCents(1850)).toBe("$18.50");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(123456)).toBe("$1,234.56");
  });

  it("accepts other currencies", () => {
    expect(formatCents(1000, "eur")).toBe("€10.00");
  });

  it("rejects fractional cents", () => {
    expect(() => formatCents(10.5)).toThrow(TypeError);
  });
});

describe("unit conversion", () => {
  it("converts units to cents without float drift", () => {
    expect(unitsToCents(19.99)).toBe(1999);
    expect(unitsToCents(40)).toBe(4000);
  });

  it("converts cents to whole units, rounding down", () => {
    expect(centsToWholeUnits(1999)).toBe(19);
    expect(centsToWholeUnits(4000)).toBe(40);
  });
});
