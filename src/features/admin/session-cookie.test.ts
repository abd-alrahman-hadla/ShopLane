import { describe, expect, it } from "vitest";
import { sessionTokenFromCookieHeader } from "./session-cookie";

describe("sessionTokenFromCookieHeader", () => {
  it("reads the plain-HTTP cookie", () => {
    expect(sessionTokenFromCookieHeader("theme=dark; authjs.session-token=abc123; other=1")).toBe(
      "abc123",
    );
  });

  it("prefers the __Secure- cookie used over HTTPS", () => {
    expect(
      sessionTokenFromCookieHeader(
        "authjs.session-token=plain; __Secure-authjs.session-token=secure",
      ),
    ).toBe("secure");
  });

  it("decodes values and ignores lookalike names", () => {
    expect(
      sessionTokenFromCookieHeader("xauthjs.session-token=nope; authjs.session-token=a%3Db"),
    ).toBe("a=b");
  });

  it("returns null without a session cookie", () => {
    expect(sessionTokenFromCookieHeader(null)).toBeNull();
    expect(sessionTokenFromCookieHeader("theme=dark")).toBeNull();
  });
});
