import { describe, expect, it } from "vitest";
import {
  MAX_CART_LINES,
  MAX_QUANTITY_PER_LINE,
  addItem,
  clampQuantity,
  dedupeItems,
  itemCount,
  mergeCarts,
  removeItem,
  setQuantity,
  type CartItem,
} from "./cart";

describe("clampQuantity", () => {
  it("clamps to the per-line limit and the given max", () => {
    expect(clampQuantity(25)).toBe(MAX_QUANTITY_PER_LINE);
    expect(clampQuantity(5, 3)).toBe(3);
    expect(clampQuantity(5, 50)).toBe(5);
  });

  it("floors fractions and rejects negatives and NaN", () => {
    expect(clampQuantity(2.7)).toBe(2);
    expect(clampQuantity(-4)).toBe(0);
    expect(clampQuantity(Number.NaN)).toBe(0);
  });
});

describe("addItem", () => {
  it("appends a new line", () => {
    expect(addItem([], "v1")).toEqual([{ variantId: "v1", quantity: 1 }]);
  });

  it("increments an existing line up to the stock limit", () => {
    const items = [{ variantId: "v1", quantity: 2 }];
    expect(addItem(items, "v1", 1)).toEqual([{ variantId: "v1", quantity: 3 }]);
    expect(addItem(items, "v1", 5, 4)).toEqual([{ variantId: "v1", quantity: 4 }]);
  });

  it("does not add sold-out items", () => {
    expect(addItem([], "v1", 1, 0)).toEqual([]);
  });

  it("stops at the maximum number of lines", () => {
    const full: CartItem[] = Array.from({ length: MAX_CART_LINES }, (_, i) => ({
      variantId: `v${i}`,
      quantity: 1,
    }));
    expect(addItem(full, "extra")).toHaveLength(MAX_CART_LINES);
  });
});

describe("setQuantity / removeItem", () => {
  const items = [
    { variantId: "a", quantity: 1 },
    { variantId: "b", quantity: 2 },
  ];

  it("updates a line", () => {
    expect(setQuantity(items, "b", 5)).toEqual([
      { variantId: "a", quantity: 1 },
      { variantId: "b", quantity: 5 },
    ]);
  });

  it("removes a line at zero", () => {
    expect(setQuantity(items, "a", 0)).toEqual([{ variantId: "b", quantity: 2 }]);
  });

  it("removes a line", () => {
    expect(removeItem(items, "a")).toEqual([{ variantId: "b", quantity: 2 }]);
  });

  it("counts items", () => {
    expect(itemCount(items)).toBe(3);
  });
});

describe("dedupeItems", () => {
  it("sums duplicate variants", () => {
    expect(
      dedupeItems([
        { variantId: "a", quantity: 1 },
        { variantId: "a", quantity: 2 },
      ]),
    ).toEqual([{ variantId: "a", quantity: 3 }]);
  });
});

describe("mergeCarts", () => {
  it("sums quantities for the same variant and keeps server order", () => {
    const merged = mergeCarts(
      [
        { variantId: "a", quantity: 1 },
        { variantId: "b", quantity: 1 },
      ],
      [
        { variantId: "b", quantity: 2 },
        { variantId: "c", quantity: 1 },
      ],
      new Map([
        ["a", 10],
        ["b", 10],
        ["c", 10],
      ]),
    );
    expect(merged).toEqual([
      { variantId: "a", quantity: 1 },
      { variantId: "b", quantity: 3 },
      { variantId: "c", quantity: 1 },
    ]);
  });

  it("clamps to available stock and the per-line limit", () => {
    const merged = mergeCarts(
      [{ variantId: "a", quantity: 3 }],
      [
        { variantId: "a", quantity: 3 },
        { variantId: "b", quantity: 9 },
      ],
      new Map([
        ["a", 4],
        ["b", 100],
      ]),
    );
    expect(merged).toEqual([
      { variantId: "a", quantity: 4 },
      { variantId: "b", quantity: 9 },
    ]);
    expect(
      mergeCarts(
        [{ variantId: "b", quantity: 8 }],
        [{ variantId: "b", quantity: 8 }],
        new Map([["b", 100]]),
      ),
    ).toEqual([{ variantId: "b", quantity: MAX_QUANTITY_PER_LINE }]);
  });

  it("drops unknown and sold-out variants", () => {
    const merged = mergeCarts(
      [{ variantId: "gone", quantity: 1 }],
      [{ variantId: "soldout", quantity: 1 }],
      new Map([["soldout", 0]]),
    );
    expect(merged).toEqual([]);
  });
});
