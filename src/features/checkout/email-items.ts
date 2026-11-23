import type { PrismaClient } from "@/generated/prisma/client";
import { variantLabel } from "@/features/catalog/variant-labels";
import type { Locale } from "@/i18n/routing";

type SnapshotItem = { variantId: string | null; productName: string; variantTitle: string };

/**
 * Order items for an email in the customer's language. Orders snapshot the
 * English name; the translation is looked up through the variant. Deleted
 * variants or missing translations keep the snapshot.
 */
export async function localizeOrderItems<T extends SnapshotItem>(
  db: Pick<PrismaClient, "variant">,
  items: T[],
  locale: Locale,
): Promise<T[]> {
  if (locale === "en") return items;
  const variantIds = [
    ...new Set(items.flatMap((item) => (item.variantId ? [item.variantId] : []))),
  ];
  const variants =
    variantIds.length === 0
      ? []
      : await db.variant.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            product: {
              select: { translations: { where: { locale }, select: { name: true }, take: 1 } },
            },
          },
        });
  const names = new Map(
    variants.flatMap((variant) => {
      const name = variant.product.translations[0]?.name;
      return name ? [[variant.id, name] as const] : [];
    }),
  );
  return items.map((item) => ({
    ...item,
    productName: (item.variantId && names.get(item.variantId)) || item.productName,
    variantTitle: variantLabel(item.variantTitle, locale),
  }));
}
