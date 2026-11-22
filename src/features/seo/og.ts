/** Helpers for the next/og social cards (1200×630). */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_COLORS = {
  paper: "#fdfaf5",
  espresso: "#4a3426",
  ink: "#2b211b",
  muted: "#7a6a5e",
} as const;

/**
 * The card renderer only decodes PNG/JPEG, so ask Unsplash for a JPEG at card
 * size instead of letting `auto=format` negotiate AVIF/WebP.
 */
export function ogPhotoUrl(url: string, width = 640): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "images.unsplash.com") return url;
    parsed.searchParams.delete("auto");
    parsed.searchParams.set("fm", "jpg");
    parsed.searchParams.set("w", String(width));
    parsed.searchParams.set("q", "75");
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Fetches a photo as a data URL; null when it can't be loaded, so the card still renders. */
export async function loadPhoto(url: string): Promise<string | null> {
  try {
    const response = await fetch(ogPhotoUrl(url), { signal: AbortSignal.timeout(8000) });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !/^image\/(jpeg|png)/.test(type)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${type.split(";")[0]};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
