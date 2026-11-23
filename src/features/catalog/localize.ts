/**
 * Catalog content in other languages lives in *Translation rows. English is on
 * the base row and is the fallback for any field a translation leaves empty.
 */
import type { Locale } from "@/i18n/routing";

export type ContentTranslation = {
  name: string;
  description?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

type Localizable = {
  name: string;
  description?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

function pick<T extends string | null | undefined>(translated: T, base: T): T {
  return typeof translated === "string" && translated.trim() !== "" ? translated : base;
}

/** Base fields overlaid with the translation's non-empty fields. */
export function localizeContent<T extends Localizable>(
  base: T,
  translation: ContentTranslation | undefined,
): T {
  if (!translation) return base;
  return {
    ...base,
    name: pick(translation.name, base.name),
    ...(base.description !== undefined && {
      description: pick(translation.description, base.description),
    }),
    ...("seoTitle" in base && { seoTitle: pick(translation.seoTitle, base.seoTitle) }),
    ...("seoDescription" in base && {
      seoDescription: pick(translation.seoDescription, base.seoDescription),
    }),
  };
}

/** Prisma `translations` select for one locale (none for the default language). */
export function translationsFor<S extends Record<string, true>>(locale: Locale, select: S) {
  return { where: { locale }, select, take: 1 } as const;
}
