import { describe, expect, it } from "vitest";
import { addressFromFormData, addressInputSchema } from "./schemas";

const valid = {
  fullName: "Jamie Rivera",
  line1: "123 Roast Street",
  line2: "",
  city: "Portland",
  region: "or",
  postalCode: "97205",
  phone: "",
};

describe("addressInputSchema", () => {
  it("normalizes a valid address", () => {
    expect(addressInputSchema.parse(valid)).toEqual({
      fullName: "Jamie Rivera",
      line1: "123 Roast Street",
      line2: null,
      city: "Portland",
      region: "OR",
      postalCode: "97205",
      phone: null,
    });
  });

  it("accepts ZIP+4 and a formatted phone number", () => {
    const parsed = addressInputSchema.parse({
      ...valid,
      postalCode: "97205-1234",
      phone: "+1 (503) 555-0100",
    });
    expect(parsed.postalCode).toBe("97205-1234");
    expect(parsed.phone).toBe("+1 (503) 555-0100");
  });

  it("rejects invalid ZIP codes, states and phones", () => {
    expect(addressInputSchema.safeParse({ ...valid, postalCode: "9720" }).success).toBe(false);
    expect(addressInputSchema.safeParse({ ...valid, postalCode: "ABCDE" }).success).toBe(false);
    expect(addressInputSchema.safeParse({ ...valid, region: "ZZ" }).success).toBe(false);
    expect(addressInputSchema.safeParse({ ...valid, phone: "call me" }).success).toBe(false);
  });

  it("requires name, street and city", () => {
    for (const field of ["fullName", "line1", "city"] as const) {
      expect(addressInputSchema.safeParse({ ...valid, [field]: "   " }).success).toBe(false);
    }
  });

  it("rejects unknown fields such as userId", () => {
    expect(addressInputSchema.safeParse({ ...valid, userId: "u2" }).success).toBe(false);
  });
});

describe("addressFromFormData", () => {
  it("reads only the address fields", () => {
    const form = new FormData();
    form.set("fullName", "Jamie");
    form.set("userId", "u2");
    const fields = addressFromFormData(form);
    expect(fields.fullName).toBe("Jamie");
    expect(fields.line2).toBe("");
    expect("userId" in fields).toBe(false);
  });
});
