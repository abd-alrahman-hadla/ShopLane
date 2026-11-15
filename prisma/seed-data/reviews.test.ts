import { describe, expect, it } from "vitest";
import { reviewInputSchema } from "../../src/features/reviews/schemas";
import { seedProducts } from "./index";
import { DEMO_ORDER_DAYS_AGO, seedCustomers, seedReviews } from "./reviews";

describe("seed reviews", () => {
  const activeSlugs = new Set(
    seedProducts.filter((p) => (p.status ?? "ACTIVE") === "ACTIVE").map((p) => p.slug),
  );

  it("uses example.com demo customers only", () => {
    expect(seedCustomers.length).toBeGreaterThanOrEqual(5);
    for (const customer of seedCustomers) expect(customer.email).toMatch(/@example\.com$/);
    expect(new Set(seedCustomers.map((c) => c.key)).size).toBe(seedCustomers.length);
  });

  it("reviews only active products, by known customers, once each", () => {
    const keys = new Set(seedCustomers.map((c) => c.key));
    const pairs = new Set<string>();
    for (const review of seedReviews) {
      expect(activeSlugs.has(review.product), review.product).toBe(true);
      expect(keys.has(review.customer), review.customer).toBe(true);
      const pair = `${review.customer}:${review.product}`;
      expect(pairs.has(pair), pair).toBe(false);
      pairs.add(pair);
    }
  });

  it("passes the same validation as real reviews", () => {
    for (const review of seedReviews) {
      const parsed = reviewInputSchema.safeParse({
        productId: "p",
        rating: review.rating,
        body: review.body,
      });
      expect(parsed.success, `${review.customer}:${review.product}`).toBe(true);
    }
  });

  it("dates every review after the demo order", () => {
    for (const review of seedReviews) {
      expect(review.daysAgo).toBeGreaterThan(0);
      expect(review.daysAgo).toBeLessThan(DEMO_ORDER_DAYS_AGO);
    }
  });

  it("covers the featured products and a spread of ratings", () => {
    const reviewed = new Set(seedReviews.map((r) => r.product));
    const featured = seedProducts.filter((p) => p.featured && (p.status ?? "ACTIVE") === "ACTIVE");
    for (const product of featured) expect(reviewed.has(product.slug), product.slug).toBe(true);
    expect(new Set(seedReviews.map((r) => r.rating)).size).toBeGreaterThanOrEqual(4);
  });
});
