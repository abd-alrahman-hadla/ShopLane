import { describe, expect, it } from "vitest";
import { ogPhotoUrl } from "./og";

describe("ogPhotoUrl", () => {
  it("requests a JPEG at card size from Unsplash", () => {
    const url = new URL(
      ogPhotoUrl("https://images.unsplash.com/photo-1?auto=format&fit=crop&w=1200&q=80"),
    );
    expect(url.searchParams.get("auto")).toBeNull();
    expect(url.searchParams.get("fm")).toBe("jpg");
    expect(url.searchParams.get("w")).toBe("640");
    expect(url.searchParams.get("fit")).toBe("crop");
  });

  it("leaves other hosts and invalid URLs untouched", () => {
    expect(ogPhotoUrl("https://utfs.io/f/abc")).toBe("https://utfs.io/f/abc");
    expect(ogPhotoUrl("not a url")).toBe("not a url");
  });
});
