import { getTranslations } from "next-intl/server";
import { IntentLink } from "@/components/intent-link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { CategorySummary } from "@/features/catalog/types";

type SiteFooterProps = {
  categories: CategorySummary[];
};

export async function SiteFooter({ categories }: SiteFooterProps) {
  const t = await getTranslations("footer");
  return (
    <footer className="bg-secondary/60 mt-24 border-t">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm sm:grid-cols-3 sm:px-6">
        <div className="flex flex-col gap-2">
          <span className="font-semibold">ShopLane</span>
          <p className="text-muted-foreground max-w-xs">{t("tagline")}</p>
        </div>
        <nav aria-label={t("nav")} className="flex flex-col gap-2">
          <span className="font-medium">{t("shop")}</span>
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
        <div className="text-muted-foreground flex flex-col gap-2 sm:items-end">
          <LanguageSwitcher className="h-auto px-0" />
          <p className="sm:text-end">{t("credits", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
