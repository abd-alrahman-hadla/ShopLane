import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form/product-form";
import { requireAdminPage } from "@/features/admin/guard";
import { listCategoryOptions } from "@/features/admin/products/queries";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdminPage("/admin/products/new");
  const categories = await listCategoryOptions(db);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/products" className="text-muted-foreground hover:text-foreground text-sm">
        ← Products
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
      <p className="text-muted-foreground text-sm">
        New products start as drafts, hidden from the store until you set them to Active.
      </p>
      <ProductForm product={null} categories={categories} />
    </div>
  );
}
