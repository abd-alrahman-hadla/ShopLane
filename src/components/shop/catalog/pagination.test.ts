import { describe, expect, it } from "vitest";
import { getPageItems } from "./pagination";

describe("getPageItems", () => {
  it("lists every page when there are few", () => {
    expect(getPageItems(2, 3)).toEqual([1, 2, 3]);
  });

  it("inserts gaps around a window in the middle", () => {
    expect(getPageItems(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10]);
  });

  it("handles the first and last pages", () => {
    expect(getPageItems(1, 10)).toEqual([1, 2, "gap", 10]);
    expect(getPageItems(10, 10)).toEqual([1, "gap", 9, 10]);
  });
});
