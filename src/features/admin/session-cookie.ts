const SESSION_COOKIES = ["__Secure-authjs.session-token", "authjs.session-token"] as const;

/** Reads the Auth.js session token from a raw Cookie header (HTTPS name preferred). */
export function sessionTokenFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  const cookies = new Map(
    header.split(";").map((part) => {
      const [name, ...rest] = part.trim().split("=");
      return [name ?? "", decodeURIComponent(rest.join("="))] as const;
    }),
  );
  for (const name of SESSION_COOKIES) {
    const value = cookies.get(name);
    if (value) return value;
  }
  return null;
}
