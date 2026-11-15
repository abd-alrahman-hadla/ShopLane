// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const useSession = vi.fn();
const setWishlistedAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/products/stoneware-mug",
}));
vi.mock("next-auth/react", () => ({ useSession: () => useSession() }));
vi.mock("@/features/wishlist/actions", () => ({
  setWishlistedAction: (input: unknown) => setWishlistedAction(input),
}));

const { useWishlistStore } = await import("@/features/wishlist/store");
const { WishlistButton } = await import("./wishlist-button");

beforeEach(() => {
  useWishlistStore.getState().reset();
  push.mockReset();
  setWishlistedAction.mockReset();
});

afterEach(cleanup);

describe("WishlistButton", () => {
  it("sends signed-out shoppers to sign-in and back", async () => {
    useSession.mockReturnValue({ status: "unauthenticated", data: null });
    render(<WishlistButton productId="p1" productName="Stoneware Mug" />);

    await userEvent.click(screen.getByRole("button", { name: "Save Stoneware Mug to wishlist" }));

    expect(push).toHaveBeenCalledWith("/sign-in?callbackUrl=%2Fproducts%2Fstoneware-mug");
    expect(setWishlistedAction).not.toHaveBeenCalled();
  });

  it("toggles optimistically and persists through the action", async () => {
    useSession.mockReturnValue({ status: "authenticated", data: { user: { id: "u1" } } });
    setWishlistedAction.mockResolvedValue({ ok: true, wishlisted: true });
    render(<WishlistButton productId="p1" productName="Stoneware Mug" />);

    const button = screen.getByRole("button", { name: "Save Stoneware Mug to wishlist" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);

    expect(
      screen.getByRole("button", { name: "Remove Stoneware Mug from wishlist" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(setWishlistedAction).toHaveBeenCalledWith({ productId: "p1", wishlisted: true });
  });

  it("rolls back when the server refuses", async () => {
    useSession.mockReturnValue({ status: "authenticated", data: { user: { id: "u1" } } });
    setWishlistedAction.mockResolvedValue({ ok: false, error: "product_not_found" });
    render(<WishlistButton productId="p1" productName="Stoneware Mug" />);

    await userEvent.click(screen.getByRole("button", { name: "Save Stoneware Mug to wishlist" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save Stoneware Mug to wishlist" }),
      ).toHaveAttribute("aria-pressed", "false"),
    );
  });
});
