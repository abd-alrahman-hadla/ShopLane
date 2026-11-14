import { describe, expect, it, vi } from "vitest";
import { computePriceRange, syncProductPriceRange } from "./pricing";

describe("computePriceRange", () => {
  it("returns min and max across variants", () => {
    expect(
      computePriceRange([{ priceCents: 3200 }, { priceCents: 2800 }, { priceCents: 4100 }]),
    ).toEqual({
      minPriceCents: 2800,
      maxPriceCents: 4100,
    });
  });

  it("handles a single variant", () => {
    expect(computePriceRange([{ priceCents: 1500 }])).toEqual({
      minPriceCents: 1500,
      maxPriceCents: 1500,
    });
  });

  it("returns zeros when there are no variants", () => {
    expect(computePriceRange([])).toEqual({ minPriceCents: 0, maxPriceCents: 0 });
  });
});

describe("syncProductPriceRange", () => {
  it("writes the computed range to the product", async () => {
    const update = vi.fn().mockResolvedValue({});
    const db = {
      variant: { findMany: vi.fn().mockResolvedValue([{ priceCents: 900 }, { priceCents: 1900 }]) },
      product: { update },
    };

    // The fake only implements the two methods syncProductPriceRange uses.
    const range = await syncProductPriceRange(
      db as unknown as Parameters<typeof syncProductPriceRange>[0],
      "p1",
    );

    expect(range).toEqual({ minPriceCents: 900, maxPriceCents: 1900 });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { minPriceCents: 900, maxPriceCents: 1900 },
    });
  });
});
