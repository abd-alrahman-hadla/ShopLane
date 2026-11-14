import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));

const { CATALOG_TAGS, revalidateCatalog } = await import("./cache");

describe("revalidateCatalog", () => {
  beforeEach(() => revalidateTag.mockClear());

  it("always purges the product list tag", () => {
    expect(revalidateCatalog()).toEqual(["products"]);
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith("products");
  });

  it("purges each changed product page", () => {
    revalidateCatalog({ productSlugs: ["stoneware-mug", "old-mug-slug"] });
    expect(revalidateTag.mock.calls.flat()).toEqual([
      "products",
      "product:stoneware-mug",
      "product:old-mug-slug",
    ]);
  });

  it("purges categories when asked", () => {
    revalidateCatalog({ categories: true });
    expect(revalidateTag.mock.calls.flat()).toEqual(["products", "categories"]);
  });

  it("does not purge the same tag twice", () => {
    revalidateCatalog({ productSlugs: ["a", "a"] });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
  });

  it("builds product tags from slugs", () => {
    expect(CATALOG_TAGS.product("hand-burr-grinder")).toBe("product:hand-burr-grinder");
  });
});
