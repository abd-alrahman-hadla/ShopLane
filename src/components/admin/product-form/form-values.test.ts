import { describe, expect, it } from "vitest";
import { productFormSchema } from "@/features/admin/products/schemas";
import { toFormValues, toPayload, type EditableProduct } from "./form-values";

const product: EditableProduct = {
  id: "p1",
  name: "Stoneware Mug",
  slug: "stoneware-mug",
  description: "Wheel-thrown stoneware with a satin glaze.",
  categoryId: "c1",
  status: "ACTIVE",
  featured: true,
  seoTitle: null,
  seoDescription: null,
  variants: [
    {
      id: "v1",
      sku: "CA-STM-08-WHT",
      title: "8 oz / White",
      size: "8 oz",
      color: "White",
      priceCents: 2200,
      compareAtPriceCents: null,
      stock: 30,
      orderCount: 2,
    },
  ],
  images: [
    {
      id: "i1",
      url: "https://images.unsplash.com/photo-1",
      alt: "A mug",
      variantSku: "CA-STM-08-WHT",
    },
  ],
  arabic: {
    name: "كوب من الفخار الحجري",
    description: "فخار حجري مشكّل على عجلة الفخار.",
    seoTitle: null,
    seoDescription: null,
  },
};

describe("product form values", () => {
  it("round-trips an existing product into a valid server payload", () => {
    const result = toPayload(toFormValues(product, "c1"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.variants[0]).toMatchObject({
      id: "v1",
      priceCents: 2200,
      compareAtPriceCents: null,
      stock: 30,
    });
    expect(result.payload.translations).toEqual({
      ar: {
        name: "كوب من الفخار الحجري",
        description: "فخار حجري مشكّل على عجلة الفخار.",
        seoTitle: "",
        seoDescription: "",
      },
    });
    expect(productFormSchema.safeParse(result.payload).success).toBe(true);
  });

  it("sends empty Arabic fields when there is no Arabic version", () => {
    const result = toPayload(toFormValues({ ...product, arabic: null }, "c1"));
    expect(result.ok && result.payload.translations?.ar.name).toBe("");
    expect(result.ok && productFormSchema.safeParse(result.payload).success).toBe(true);
  });

  it("rejects Arabic content without an Arabic name", () => {
    const values = toFormValues(product, "c1");
    values.arabic = { name: "", description: "وصف فقط", seoTitle: "", seoDescription: "" };
    const result = toPayload(values);
    const parsed = result.ok ? productFormSchema.safeParse(result.payload) : null;
    expect(parsed?.success).toBe(false);
    expect(parsed?.error?.issues[0]?.path).toEqual(["translations", "ar", "name"]);
  });

  it("starts a new product as a draft with one empty variant", () => {
    const values = toFormValues(null, "c9");
    expect(values).toMatchObject({ id: null, status: "DRAFT", categoryId: "c9" });
    expect(values.variants).toHaveLength(1);
  });

  it("converts typed prices exactly and reports bad ones per field", () => {
    const values = toFormValues(product, "c1");
    values.variants[0] = { ...values.variants[0]!, price: "19.99", compareAt: "24.5" };
    const ok = toPayload(values);
    expect(ok.ok && ok.payload.variants[0]).toMatchObject({
      priceCents: 1999,
      compareAtPriceCents: 2450,
    });

    values.variants[0] = { ...values.variants[0]!, price: "nineteen", stock: "2.5" };
    expect(toPayload(values)).toEqual({
      ok: false,
      fieldErrors: {
        "variants.0.priceCents": "Enter a price like 18.50.",
        "variants.0.stock": "Whole number of units.",
      },
    });
  });
});
