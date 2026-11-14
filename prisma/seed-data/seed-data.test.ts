import { describe, expect, it } from "vitest";
import { photos, seedCategories, seedCoupons, seedProducts } from "./index";

describe("seed catalog", () => {
  it("has 5 categories and 40 products, 8 per category", () => {
    expect(seedCategories).toHaveLength(5);
    expect(seedProducts).toHaveLength(40);
    for (const category of seedCategories) {
      expect(seedProducts.filter((p) => p.categorySlug === category.slug)).toHaveLength(8);
    }
  });

  it("uses unique product slugs and variant SKUs", () => {
    const slugs = seedProducts.map((p) => p.slug);
    const skus = seedProducts.flatMap((p) => p.variants.map((v) => v.sku));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("gives every product at least one variant and one image", () => {
    for (const product of seedProducts) {
      expect(product.variants.length, product.slug).toBeGreaterThan(0);
      expect(product.images.length, product.slug).toBeGreaterThan(0);
    }
  });

  it("stores prices as positive integer cents, with compare-at above price", () => {
    for (const variant of seedProducts.flatMap((p) => p.variants)) {
      expect(Number.isInteger(variant.priceCents), variant.sku).toBe(true);
      expect(variant.priceCents, variant.sku).toBeGreaterThan(0);
      expect(Number.isInteger(variant.stock) && variant.stock >= 0, variant.sku).toBe(true);
      if (variant.compareAtPriceCents !== undefined) {
        expect(variant.compareAtPriceCents, variant.sku).toBeGreaterThan(variant.priceCents);
      }
    }
  });

  it("only links images to variants of the same product", () => {
    for (const product of seedProducts) {
      const skus = new Set(product.variants.map((v) => v.sku));
      for (const image of product.images) {
        expect(photos[image.photo], `${product.slug}: ${image.photo}`).toBeDefined();
        if (image.variantSku) {
          expect(skus.has(image.variantSku), `${product.slug}: ${image.variantSku}`).toBe(true);
        }
      }
    }
  });

  it("covers the storefront scenarios: featured, sale, sold out and drafts", () => {
    const active = seedProducts.filter((p) => (p.status ?? "ACTIVE") === "ACTIVE");
    const featured = active.filter((p) => p.featured);
    const onSale = active.filter((p) =>
      p.variants.some((v) => v.compareAtPriceCents !== undefined),
    );
    const soldOut = active.filter((p) => p.variants.every((v) => v.stock === 0));
    const drafts = seedProducts.filter((p) => p.status === "DRAFT");

    expect(featured).toHaveLength(8);
    expect(onSale.length).toBeGreaterThanOrEqual(5);
    expect(soldOut.length).toBeGreaterThanOrEqual(2);
    expect(drafts).toHaveLength(2);
    expect(drafts.some((p) => p.featured)).toBe(false);
  });

  it("has valid coupons", () => {
    expect(seedCoupons.map((c) => c.code)).toEqual(["WELCOME10", "BREW5"]);
  });
});
