import { describe, expect, it } from "vitest";
import { diffFields } from "./audit";

describe("diffFields", () => {
  it("returns only changed fields as [before, after]", () => {
    expect(
      diffFields(
        { name: "Mug", price: 2200, featured: false },
        { name: "Stoneware Mug", price: 2200, featured: true },
        ["name", "price", "featured"],
      ),
    ).toEqual({ name: ["Mug", "Stoneware Mug"], featured: [false, true] });
  });

  it("treats a missing 'before' as a creation", () => {
    expect(diffFields(null, { code: "SAVE10" }, ["code"])).toEqual({ code: [null, "SAVE10"] });
  });

  it("normalizes dates and undefined so the result is plain JSON", () => {
    const changes = diffFields<{ endsAt: Date; note: string | null | undefined }>(
      { endsAt: new Date("2026-01-01T00:00:00Z"), note: undefined },
      { endsAt: new Date("2026-02-01T00:00:00Z"), note: null },
      ["endsAt", "note"],
    );
    expect(changes).toEqual({ endsAt: ["2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z"] });
  });

  it("compares arrays and objects by value", () => {
    expect(diffFields({ tags: ["a", "b"] }, { tags: ["a", "b"] }, ["tags"])).toEqual({});
    expect(diffFields({ tags: ["a"] }, { tags: ["a", "b"] }, ["tags"])).toEqual({
      tags: [["a"], ["a", "b"]],
    });
  });

  it("ignores fields not listed", () => {
    expect(diffFields({ a: 1, b: 1 }, { a: 1, b: 2 }, ["a"])).toEqual({});
  });
});
