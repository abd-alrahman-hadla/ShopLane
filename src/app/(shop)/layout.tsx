import { SiteFooter } from "@/components/shop/site-footer";
import { SiteHeader } from "@/components/shop/site-header";
import { getCategories } from "@/features/catalog/queries";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader categories={categories} />
      <main className="flex-1">{children}</main>
      <SiteFooter categories={categories} />
    </div>
  );
}
