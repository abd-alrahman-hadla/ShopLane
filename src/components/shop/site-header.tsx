import { CoffeeIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { IntentLink } from "@/components/intent-link";
import type { CategorySummary } from "@/features/catalog/types";
import { Link } from "@/i18n/navigation";
import { AccountMenu } from "./account/account-menu";
import { CartButton } from "./cart/cart-button";
import { SearchBox } from "./search-box";

type SiteHeaderProps = {
  categories: CategorySummary[];
};

export async function SiteHeader({ categories }: SiteHeaderProps) {
  const t = await getTranslations("header");
  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t("home")}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <CoffeeIcon className="text-primary size-5" aria-hidden />
          <span dir="ltr">ShopLane</span>
        </Link>
        <nav
          aria-label={t("categoriesNav")}
          className="hidden flex-1 items-center gap-5 text-sm lg:flex"
        >
          <IntentLink href="/products" className="text-muted-foreground hover:text-foreground">
            {t("shopAll")}
          </IntentLink>
          {categories.map((category) => (
            <IntentLink
              key={category.id}
              href={`/categories/${category.slug}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {category.name}
            </IntentLink>
          ))}
        </nav>
        <SearchBox className="ms-auto w-full max-w-56" />
        <div className="flex items-center gap-0.5">
          <AccountMenu />
          <CartButton />
        </div>
      </div>
      <nav aria-label={t("categoriesNav")} className="border-t lg:hidden">
        <ul className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-4 py-2 text-sm whitespace-nowrap sm:px-6">
          <li>
            <IntentLink href="/products" className="text-muted-foreground hover:text-foreground">
              {t("shopAll")}
            </IntentLink>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <IntentLink
                href={`/categories/${category.slug}`}
                className="text-muted-foreground hover:text-foreground"
              >
                {category.name}
              </IntentLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
