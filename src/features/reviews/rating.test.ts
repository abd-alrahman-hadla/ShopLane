import { describe, expect, it } from "vitest";
import {
  averageRating,
  ratingDistribution,
  ratingSummary,
  reviewerDisplayName,
  starFill,
} from "./rating";

describe("averageRating", () => {
  it("rounds to one decimal", () => {
    expect(averageRating(14, 3)).toBe(4.7);
    expect(averageRating(9, 2)).toBe(4.5);
    expect(averageRating(5, 1)).toBe(5);
  });

  it("is null without reviews", () => {
    expect(averageRating(0, 0)).toBeNull();
    expect(ratingSummary(0, 0)).toBeNull();
  });

  it("builds a summary", () => {
    expect(ratingSummary(23, 5)).toEqual({ average: 4.6, count: 5 });
  });
});

describe("starFill", () => {
  it("rounds to the nearest half star", () => {
    expect(starFill(4.6)).toEqual(["full", "full", "full", "full", "half"]);
    expect(starFill(4.8)).toEqual(["full", "full", "full", "full", "full"]);
    expect(starFill(3.2)).toEqual(["full", "full", "full", "empty", "empty"]);
    expect(starFill(1)).toEqual(["full", "empty", "empty", "empty", "empty"]);
  });

  it("clamps out-of-range values", () => {
    expect(starFill(9)).toEqual(Array(5).fill("full"));
    expect(starFill(-1)).toEqual(Array(5).fill("empty"));
  });
});

describe("ratingDistribution", () => {
  it("lists every star from 5 to 1, filling gaps with zero", () => {
    expect(
      ratingDistribution([
        { rating: 5, count: 3 },
        { rating: 2, count: 1 },
      ]),
    ).toEqual([
      { rating: 5, count: 3 },
      { rating: 4, count: 0 },
      { rating: 3, count: 0 },
      { rating: 2, count: 1 },
      { rating: 1, count: 0 },
    ]);
  });
});

describe("reviewerDisplayName", () => {
  it("shortens to first name and last initial", () => {
    expect(reviewerDisplayName("Jamie Rivera")).toBe("Jamie R.");
    expect(reviewerDisplayName("  ana   maria  lopez ")).toBe("ana L.");
  });

  it("keeps a single name", () => {
    expect(reviewerDisplayName("Jamie")).toBe("Jamie");
  });

  it("falls back when there is no name", () => {
    expect(reviewerDisplayName(null)).toBe("Verified buyer");
    expect(reviewerDisplayName("   ")).toBe("Verified buyer");
  });
});
