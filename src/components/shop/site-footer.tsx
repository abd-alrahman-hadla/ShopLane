import Link from "next/link";
import type { CategorySummary } from "@/features/catalog/types";

type SiteFooterProps = {
  categories: CategorySummary[];
};

export function SiteFooter({ categories }: SiteFooterProps) {
  return (
    <footer className="bg-secondary/60 mt-24 border-t">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm sm:grid-cols-3 sm:px-6">
        <div className="flex flex-col gap-2">
          <span className="font-semibold">ShopLane</span>
          <p className="text-muted-foreground max-w-xs">
            Small-batch coffee roasted every week, plus the gear we use to brew it.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2">
          <span className="font-medium">Shop</span>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {category.name}
            </Link>
          ))}
        </nav>
        <p className="text-muted-foreground sm:text-right">
          Product photos from Unsplash. © {new Date().getFullYear()} ShopLane.
        </p>
      </div>
    </footer>
  );
}
