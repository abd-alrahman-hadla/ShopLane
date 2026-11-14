import { describe, expect, it } from "vitest";
import { toProductCard, type ProductCardRow } from "./mappers";

const baseRow: ProductCardRow = {
  id: "p1",
  slug: "stoneware-mug",
  name: "Stoneware Mug",
  minPriceCents: 2200,
  maxPriceCents: 2400,
  category: { name: "Cups & Accessories" },
  images: [{ url: "https://example.com/a.jpg", alt: "A mug" }],
  variants: [
    { priceCents: 2400, compareAtPriceCents: null, stock: 3 },
    { priceCents: 2200, compareAtPriceCents: 2600, stock: 0 },
  ],
};

describe("toProductCard", () => {
  it("maps price range, image, sale and stock", () => {
    expect(toProductCard(baseRow)).toEqual({
      id: "p1",
      slug: "stoneware-mug",
      name: "Stoneware Mug",
      categoryName: "Cups & Accessories",
      image: { url: "https://example.com/a.jpg", alt: "A mug" },
      priceFromCents: 2200,
      hasPriceRange: true,
      compareAtCents: 2600,
      inStock: true,
    });
  });

  it("marks products with no stock as sold out", () => {
    const card = toProductCard({
      ...baseRow,
      variants: [{ priceCents: 2200, compareAtPriceCents: null, stock: 0 }],
    });
    expect(card.inStock).toBe(false);
  });

  it("ignores a compare-at price that is not higher than the price", () => {
    const card = toProductCard({
      ...baseRow,
      variants: [{ priceCents: 2200, compareAtPriceCents: 2200, stock: 1 }],
    });
    expect(card.compareAtCents).toBeNull();
  });

  it("handles a product without images", () => {
    expect(toProductCard({ ...baseRow, images: [] }).image).toBeNull();
  });
});
