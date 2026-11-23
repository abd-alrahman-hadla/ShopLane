import Form from "next/form";
import { SearchIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Input } from "@/components/ui/input";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type SearchBoxProps = {
  defaultValue?: string;
  className?: string;
};

/** GET form to /search (or /ar/search). Works without JavaScript; next/form adds client navigation. */
export async function SearchBox({ defaultValue, className }: SearchBoxProps) {
  const [t, locale] = await Promise.all([getTranslations("header"), getLocale()]);
  const action = getPathname({ href: "/search", locale: locale as Locale });
  return (
    <Form action={action} role="search" className={cn("relative", className)}>
      <label htmlFor="site-search" className="sr-only">
        {t("searchLabel")}
      </label>
      <SearchIcon className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
      <Input
        id="site-search"
        name="q"
        type="search"
        placeholder={t("searchPlaceholder")}
        defaultValue={defaultValue}
        className="h-9 ps-8"
        maxLength={100}
      />
    </Form>
  );
}
