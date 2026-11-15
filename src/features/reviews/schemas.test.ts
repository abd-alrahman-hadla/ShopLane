import { describe, expect, it } from "vitest";
import { reviewInputSchema } from "./schemas";

const valid = { productId: "p1", rating: 4, body: "Bright, juicy and sweet." };

describe("reviewInputSchema", () => {
  it("accepts a valid review and trims the text", () => {
    expect(reviewInputSchema.parse({ ...valid, body: "  Bright, juicy and sweet.  " })).toEqual(
      valid,
    );
  });

  it("only accepts whole ratings from 1 to 5", () => {
    for (const rating of [1, 5])
      expect(reviewInputSchema.safeParse({ ...valid, rating }).success).toBe(true);
    for (const rating of [0, 6, 4.5, -1]) {
      expect(reviewInputSchema.safeParse({ ...valid, rating }).success).toBe(false);
    }
  });

  it("enforces text length after trimming", () => {
    expect(reviewInputSchema.safeParse({ ...valid, body: "   too short   " }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ ...valid, body: "x".repeat(2001) }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ ...valid, body: "x".repeat(2000) }).success).toBe(true);
  });

  it("rejects extra fields such as a user id", () => {
    expect(reviewInputSchema.safeParse({ ...valid, userId: "someone-else" }).success).toBe(false);
  });
});
