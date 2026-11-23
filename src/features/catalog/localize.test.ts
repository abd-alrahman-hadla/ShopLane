import { describe, expect, it } from "vitest";
import { localizeContent } from "./localize";

const base = {
  id: "p1",
  name: "Stoneware Mug",
  description: "A sturdy mug.",
  seoTitle: null as string | null,
  seoDescription: "Buy the mug",
};

describe("localizeContent", () => {
  it("returns the English base when there is no translation", () => {
    expect(localizeContent(base, undefined)).toBe(base);
  });

  it("overlays translated fields and keeps everything else", () => {
    expect(
      localizeContent(base, { name: "كوب حجري", description: "كوب متين.", seoTitle: "كوب" }),
    ).toEqual({
      id: "p1",
      name: "كوب حجري",
      description: "كوب متين.",
      seoTitle: "كوب",
      seoDescription: "Buy the mug",
    });
  });

  it("falls back to English for empty or missing translated fields", () => {
    expect(localizeContent(base, { name: "  ", description: "" })).toMatchObject({
      name: "Stoneware Mug",
      description: "A sturdy mug.",
    });
  });

  it("only touches fields the base has", () => {
    const card = { name: "Mug" };
    expect(localizeContent(card, { name: "كوب", description: "x" })).toEqual({ name: "كوب" });
  });
});
