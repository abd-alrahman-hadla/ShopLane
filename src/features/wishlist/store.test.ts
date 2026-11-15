import { beforeEach, describe, expect, it } from "vitest";
import { useWishlistStore } from "./store";

const store = () => useWishlistStore.getState();

beforeEach(() => store().reset());

describe("wishlist store", () => {
  it("loads the server snapshot", () => {
    store().setAll(["a", "b"]);
    expect([...store().ids]).toEqual(["a", "b"]);
    expect(store().loaded).toBe(true);
  });

  it("keeps a tap made before the initial load finished", () => {
    store().setOne("c", true); // user taps while the snapshot is in flight
    store().setOne("a", false);
    store().setAll(["a", "b"]); // older snapshot arrives
    expect([...store().ids].sort()).toEqual(["b", "c"]);
    expect(store().pendingChanges.size).toBe(0);
  });

  it("applies later taps directly once loaded", () => {
    store().setAll(["a"]);
    store().setOne("a", false);
    expect(store().ids.has("a")).toBe(false);
    expect(store().pendingChanges.size).toBe(0);
  });

  it("clears everything on sign-out", () => {
    store().setOne("a", true);
    store().reset();
    expect(store().ids.size).toBe(0);
    expect(store().loaded).toBe(false);
    expect(store().pendingChanges.size).toBe(0);
  });
});
