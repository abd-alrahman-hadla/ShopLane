import { describe, expect, it } from "vitest";
import {
  centsToPriceInput,
  isAllowedImageUrl,
  parsePriceToCents,
  productFormSchema,
  slugify,
  type ProductFormInput,
} from "./schemas";

const valid: ProductFormInput = {
  name: "Kenya Nyeri AA",
  slug: "kenya-nyeri-aa",
  description: "Blackcurrant and grapefruit from Mount Kenya.",
  categoryId: "cat1",
  status: "DRAFT",
  featured: false,
  seoTitle: "",
  seoDescription: "",
  variants: [
    {
      sku: "so-ken-250",
      title: "250 g",
      size: "250 g",
      color: "",
      priceCents: 2300,
      compareAtPriceCents: null,
      stock: 10,
    },
  ],
  images: [{ url: "https://images.unsplash.com/photo-1", alt: "Beans", variantSku: "" }],
};

describe("price helpers", () => {
  it("parses dollar inputs to cents without float drift", () => {
    expect(parsePriceToCents("12.5")).toBe(1250);
    expect(parsePriceToCents("$1,234.99")).toBe(123499);
    expect(parsePriceToCents("19.99")).toBe(1999);
    expect(parsePriceToCents("0")).toBe(0);
  });

  it("rejects malformed amounts", () => {
    for (const value of ["", "abc", "1.234", "-5", "1.2.3"])
      expect(parsePriceToCents(value), value).toBeNull();
  });

  it("formats cents for inputs", () => {
    expect(centsToPriceInput(1250)).toBe("12.50");
    expect(centsToPriceInput(null)).toBe("");
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Ethiopia Yirgacheffe – 250 g!")).toBe("ethiopia-yirgacheffe-250-g");
    expect(slugify("Café Crème & Co.")).toBe("cafe-creme-and-co");
    expect(slugify("  --Hello--  ")).toBe("hello");
  });
});

describe("isAllowedImageUrl", () => {
  it("allows Unsplash and UploadThing over https only", () => {
    expect(isAllowedImageUrl("https://images.unsplash.com/photo-1")).toBe(true);
    expect(isAllowedImageUrl("https://abc123.ufs.sh/f/key")).toBe(true);
    expect(isAllowedImageUrl("https://utfs.io/f/key")).toBe(true);
    expect(isAllowedImageUrl("http://images.unsplash.com/photo-1")).toBe(false);
    expect(isAllowedImageUrl("https://evil.example.com/x.png")).toBe(false);
    expect(isAllowedImageUrl("https://ufs.sh.evil.com/x.png")).toBe(false);
    expect(isAllowedImageUrl("not a url")).toBe(false);
  });
});

describe("productFormSchema", () => {
  it("normalizes a valid product", () => {
    const parsed = productFormSchema.parse(valid);
    expect(parsed.variants[0]).toMatchObject({
      sku: "SO-KEN-250",
      color: null,
      compareAtPriceCents: null,
    });
    expect(parsed.seoTitle).toBeNull();
    expect(parsed.images[0]?.variantSku).toBeNull();
  });

  it("enforces SEO length limits", () => {
    expect(productFormSchema.safeParse({ ...valid, seoTitle: "x".repeat(71) }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...valid, seoDescription: "x".repeat(161) }).success).toBe(
      false,
    );
  });

  it("rejects bad slugs, duplicate SKUs and compare-at below price", () => {
    expect(productFormSchema.safeParse({ ...valid, slug: "Bad Slug" }).success).toBe(false);
    const variant = valid.variants[0]!;
    const duplicate = productFormSchema.safeParse({
      ...valid,
      variants: [variant, { ...variant, sku: "SO-KEN-250" }],
    });
    expect(duplicate.success).toBe(false);
    expect(
      productFormSchema.safeParse({
        ...valid,
        variants: [{ ...variant, compareAtPriceCents: 2000 }],
      }).success,
    ).toBe(false);
  });

  it("requires at least one variant and links images only to existing SKUs", () => {
    expect(productFormSchema.safeParse({ ...valid, variants: [] }).success).toBe(false);
    expect(
      productFormSchema.safeParse({
        ...valid,
        images: [{ url: valid.images[0]!.url, alt: "x", variantSku: "NOPE" }],
      }).success,
    ).toBe(false);
  });

  it("rejects unexpected fields and non-integer cents", () => {
    expect(productFormSchema.safeParse({ ...valid, ratingSum: 99 }).success).toBe(false);
    expect(
      productFormSchema.safeParse({
        ...valid,
        variants: [{ ...valid.variants[0]!, priceCents: 12.5 }],
      }).success,
    ).toBe(false);
  });
});
