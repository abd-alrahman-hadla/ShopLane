import Link from "next/link";
import { CoffeeIcon } from "lucide-react";
import type { CategorySummary } from "@/features/catalog/types";
import { AccountMenu } from "./account/account-menu";
import { CartButton } from "./cart/cart-button";
import { SearchBox } from "./search-box";

type SiteHeaderProps = {
  categories: CategorySummary[];
};

export function SiteHeader({ categories }: SiteHeaderProps) {
  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <CoffeeIcon className="text-primary size-5" aria-hidden />
          ShopLane
        </Link>
        <nav aria-label="Categories" className="hidden flex-1 items-center gap-5 text-sm lg:flex">
          <Link href="/products" className="text-muted-foreground hover:text-foreground">
            Shop all
          </Link>
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
        <SearchBox className="ml-auto w-full max-w-56" />
        <div className="flex items-center gap-1">
          <AccountMenu />
          <CartButton />
        </div>
      </div>
      <nav aria-label="Categories" className="border-t lg:hidden">
        <ul className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-4 py-2 text-sm whitespace-nowrap sm:px-6">
          <li>
            <Link href="/products" className="text-muted-foreground hover:text-foreground">
              Shop all
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/categories/${category.slug}`}
                className="text-muted-foreground hover:text-foreground"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
