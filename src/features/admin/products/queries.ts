import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { DbClient } from "@/features/cart/quote";
import { LOW_STOCK_THRESHOLD } from "@/lib/store";

export const ADMIN_PRODUCTS_PAGE_SIZE = 25;

const listParamsSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "ALL"]).optional().catch(undefined),
  category: z.string().max(40).optional().catch(undefined),
  stock: z.enum(["low", "out"]).optional().catch(undefined),
  sort: z.enum(["updated", "name", "stock"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});

export type AdminProductFilters = {
  q?: string;
  /** Default view hides archived products. */
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "ALL" | "CURRENT";
  category?: string;
  stock?: "low" | "out";
  sort: "updated" | "name" | "stock";
  page: number;
};

export function parseAdminProductParams(
  params: Record<string, string | string[] | undefined>,
): AdminProductFilters {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const parsed = listParamsSchema.parse(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, first(value) || undefined]),
    ),
  );
  return {
    q: parsed.q || undefined,
    status: parsed.status ?? "CURRENT",
    category: parsed.category,
    stock: parsed.stock,
    sort: parsed.sort ?? "updated",
    page: parsed.page ?? 1,
  };
}

export function adminProductWhere(filters: AdminProductFilters): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];
  if (filters.status === "CURRENT") and.push({ status: { not: "ARCHIVED" } });
  else if (filters.status !== "ALL") and.push({ status: filters.status });
  if (filters.category) and.push({ categoryId: filters.category });
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" } as const;
    and.push({
      OR: [{ name: contains }, { slug: contains }, { variants: { some: { sku: contains } } }],
    });
  }
  if (filters.stock === "out") and.push({ variants: { every: { stock: 0 } } });
  if (filters.stock === "low")
    and.push({ variants: { some: { stock: { lte: LOW_STOCK_THRESHOLD } } } });
  return { AND: and };
}

export async function listAdminProducts(db: DbClient, filters: AdminProductFilters) {
  const where = adminProductWhere(filters);
  const total = await db.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PRODUCTS_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const rows = await db.product.findMany({
    where,
    orderBy: filters.sort === "name" ? [{ name: "asc" }] : [{ updatedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * ADMIN_PRODUCTS_PAGE_SIZE,
    take: ADMIN_PRODUCTS_PAGE_SIZE,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      featured: true,
      minPriceCents: true,
      maxPriceCents: true,
      updatedAt: true,
      category: { select: { name: true } },
      images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
      variants: { select: { stock: true } },
    },
  });
  const products = rows.map(({ variants, images, ...product }) => ({
    ...product,
    image: images[0] ?? null,
    totalStock: variants.reduce((sum, variant) => sum + variant.stock, 0),
    variantCount: variants.length,
    lowStock: variants.some((variant) => variant.stock <= LOW_STOCK_THRESHOLD),
  }));
  if (filters.sort === "stock") products.sort((a, b) => a.totalStock - b.totalStock);
  return { products, total, page, pageCount };
}

/** A product with everything the edit form needs, including how many orders use each variant. */
export async function getAdminProduct(db: DbClient, id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      variants: {
        orderBy: { position: "asc" },
        include: { _count: { select: { orderItems: true } } },
      },
      images: { orderBy: { position: "asc" }, include: { variant: { select: { sku: true } } } },
    },
  });
}

export async function listCategoryOptions(db: DbClient) {
  return db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
}
