import { describe, expect, it } from "vitest";
import { colorLabel, sizeLabel, variantLabel } from "./variant-labels";

describe("variant labels", () => {
  it("leaves English untouched", () => {
    expect(variantLabel("8 oz / White", "en")).toBe("8 oz / White");
    expect(sizeLabel("250 g", "en")).toBe("250 g");
    expect(colorLabel("Sage", "en")).toBe("Sage");
  });

  it("translates units, colours and known phrases into Arabic", () => {
    expect(sizeLabel("250 g", "ar")).toBe("250 غ");
    expect(sizeLabel("1–2 cup", "ar")).toBe("1–2 كوب");
    expect(sizeLabel("1 L", "ar")).toBe("1 لتر");
    expect(colorLabel("White", "ar")).toBe("أبيض");
    expect(variantLabel("8 oz / White", "ar")).toBe("8 أونصة / أبيض");
    expect(variantLabel("Set of 2 / 3 oz", "ar")).toBe("طقم من 2 / 3 أونصة");
  });

  it("shows unknown values as stored", () => {
    expect(colorLabel("Mint", "ar")).toBe("Mint");
    expect(variantLabel("Limited edition", "ar")).toBe("Limited edition");
  });
});
