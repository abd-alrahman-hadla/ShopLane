import { signInAs, useFakeStripe } from "@/test/admin";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser, createVariant, resetDatabase, testDb } from "@/test/db";
import { archiveProduct, restoreProduct, saveProduct } from "./actions";
import type { ProductFormInput } from "./schemas";

let categoryId: string;

async function signInAdmin() {
  const admin = await createUser({ email: "admin@example.com" });
  await testDb.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  signInAs({ id: admin.id, email: admin.email, role: "ADMIN" });
  return admin;
}

function form(overrides: Partial<ProductFormInput> = {}): ProductFormInput {
  return {
    id: null,
    name: "Test Dripper",
    slug: "test-dripper",
    description: "A ceramic dripper for testing.",
    categoryId,
    status: "DRAFT",
    featured: false,
    seoTitle: "",
    seoDescription: "",
    variants: [
      {
        sku: "TD-WHT",
        title: "White",
        size: "",
        color: "White",
        priceCents: 2800,
        compareAtPriceCents: null,
        stock: 10,
      },
      {
        sku: "TD-BLK",
        title: "Black",
        size: "",
        color: "Black",
        priceCents: 3200,
        compareAtPriceCents: null,
        stock: 4,
      },
    ],
    images: [
      { url: "https://images.unsplash.com/photo-a", alt: "White dripper", variantSku: "TD-WHT" },
      { url: "https://images.unsplash.com/photo-b", alt: "Black dripper", variantSku: "" },
    ],
    ...overrides,
  };
}

beforeEach(async () => {
  await resetDatabase();
  useFakeStripe();
  const category = await testDb.category.create({
    data: { slug: "brewers", name: "Brewers", description: "Brewers" },
  });
  categoryId = category.id;
  await signInAdmin();
});

describe("saveProduct", () => {
  it("creates a product with variants, ordered images, price range and an audit row", async () => {
    const result = await saveProduct(form());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const product = await testDb.product.findUniqueOrThrow({
      where: { id: result.data.id },
      include: {
        variants: { orderBy: { position: "asc" } },
        images: { orderBy: { position: "asc" }, include: { variant: true } },
      },
    });
    expect(product).toMatchObject({ status: "DRAFT", minPriceCents: 2800, maxPriceCents: 3200 });
    expect(product.variants.map((v) => v.sku)).toEqual(["TD-WHT", "TD-BLK"]);
    expect(product.images.map((i) => [i.url, i.variant?.sku ?? null])).toEqual([
      ["https://images.unsplash.com/photo-a", "TD-WHT"],
      ["https://images.unsplash.com/photo-b", null],
    ]);

    const audit = await testDb.auditLog.findFirstOrThrow({ where: { entityId: product.id } });
    expect(audit).toMatchObject({
      action: "product.create",
      actorEmail: "admin@example.com",
      entityType: "Product",
    });
    expect(audit.changes).toMatchObject({ name: [null, "Test Dripper"], status: [null, "DRAFT"] });
  });

  it("updates fields, variants and image order, recording only what changed", async () => {
    const created = await saveProduct(form());
    if (!created.ok) throw new Error(created.error);
    const product = await testDb.product.findUniqueOrThrow({
      where: { id: created.data.id },
      include: { variants: true },
    });
    const white = product.variants.find((v) => v.sku === "TD-WHT")!;

    const updated = await saveProduct(
      form({
        id: product.id,
        status: "ACTIVE",
        seoTitle: "Ceramic dripper",
        // Keep white (new price), drop black (no orders), add copper.
        variants: [
          {
            id: white.id,
            sku: "TD-WHT",
            title: "White",
            size: "",
            color: "White",
            priceCents: 2600,
            compareAtPriceCents: 2800,
            stock: 10,
          },
          {
            sku: "TD-CPR",
            title: "Copper",
            size: "",
            color: "Copper",
            priceCents: 3600,
            compareAtPriceCents: null,
            stock: 2,
          },
        ],
        images: [
          { url: "https://images.unsplash.com/photo-b", alt: "Black dripper", variantSku: "" },
          {
            url: "https://images.unsplash.com/photo-a",
            alt: "White dripper",
            variantSku: "TD-WHT",
          },
        ],
      }),
    );
    expect(updated.ok).toBe(true);

    const after = await testDb.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { variants: true, images: { orderBy: { position: "asc" } } },
    });
    expect(after).toMatchObject({
      status: "ACTIVE",
      seoTitle: "Ceramic dripper",
      minPriceCents: 2600,
      maxPriceCents: 3600,
    });
    expect(after.variants.map((v) => v.sku).sort()).toEqual(["TD-CPR", "TD-WHT"]);
    expect(after.variants.find((v) => v.sku === "TD-WHT")?.id).toBe(white.id);
    expect(after.images.map((i) => i.url)).toEqual([
      "https://images.unsplash.com/photo-b",
      "https://images.unsplash.com/photo-a",
    ]);

    const audit = await testDb.auditLog.findFirstOrThrow({ where: { action: "product.update" } });
    expect(audit.changes).toMatchObject({
      status: ["DRAFT", "ACTIVE"],
      seoTitle: [null, "Ceramic dripper"],
      variants: [
        ["TD-BLK", "TD-WHT"],
        ["TD-CPR", "TD-WHT"],
      ],
      variantDetails: [null, ["TD-WHT"]],
    });
    expect(audit.changes).not.toHaveProperty("name");
  });

  it("refuses to remove a variant that appears in past orders", async () => {
    const created = await saveProduct(form());
    if (!created.ok) throw new Error(created.error);
    const black = await testDb.variant.findUniqueOrThrow({ where: { sku: "TD-BLK" } });
    await testDb.order.create({
      data: {
        status: "PAID",
        subtotalCents: 3200,
        totalCents: 3200,
        items: {
          create: [
            {
              variantId: black.id,
              productName: "x",
              variantTitle: "Black",
              sku: "TD-BLK",
              unitPriceCents: 3200,
              quantity: 1,
              lineTotalCents: 3200,
            },
          ],
        },
      },
    });
    const white = await testDb.variant.findUniqueOrThrow({ where: { sku: "TD-WHT" } });

    const result = await saveProduct(
      form({
        id: created.data.id,
        variants: [
          {
            id: white.id,
            sku: "TD-WHT",
            title: "White",
            size: "",
            color: "",
            priceCents: 2800,
            compareAtPriceCents: null,
            stock: 10,
          },
        ],
        images: [],
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("TD-BLK appear in past orders"),
    });
    expect(await testDb.variant.count({ where: { productId: created.data.id } })).toBe(2);
    expect(await testDb.auditLog.count({ where: { action: "product.update" } })).toBe(0);
  });

  it("rejects slugs and SKUs used by other products", async () => {
    const other = await createVariant({ stock: 1 });
    const otherProduct = await testDb.product.findUniqueOrThrow({ where: { id: other.productId } });

    const slugClash = await saveProduct(form({ slug: otherProduct.slug }));
    expect(slugClash).toMatchObject({ ok: false, fieldErrors: { slug: expect.any(String) } });

    const skuClash = await saveProduct(
      form({
        variants: [
          {
            sku: other.sku,
            title: "x",
            size: "",
            color: "",
            priceCents: 100,
            compareAtPriceCents: null,
            stock: 1,
          },
        ],
        images: [],
      }),
    );
    expect(skuClash).toMatchObject({
      ok: false,
      fieldErrors: { "variants.0.sku": expect.any(String) },
    });
    expect(await testDb.product.count()).toBe(1);
  });
});

describe("archive and restore", () => {
  it("archives instead of deleting, and restores as a draft, both audited", async () => {
    const created = await saveProduct(form({ status: "ACTIVE", featured: true }));
    if (!created.ok) throw new Error(created.error);

    expect(await archiveProduct({ productId: created.data.id })).toMatchObject({ ok: true });
    expect(
      await testDb.product.findUniqueOrThrow({ where: { id: created.data.id } }),
    ).toMatchObject({
      status: "ARCHIVED",
      featured: false,
    });
    expect(await saveProduct(form({ id: created.data.id }))).toMatchObject({
      ok: false,
      error: "Restore the product before editing it.",
    });

    expect(await restoreProduct({ productId: created.data.id })).toMatchObject({ ok: true });
    expect(
      (await testDb.product.findUniqueOrThrow({ where: { id: created.data.id } })).status,
    ).toBe("DRAFT");

    const actions = (await testDb.auditLog.findMany({ orderBy: { createdAt: "asc" } })).map(
      (a) => a.action,
    );
    expect(actions).toEqual(["product.create", "product.archive", "product.restore"]);
  });
});
