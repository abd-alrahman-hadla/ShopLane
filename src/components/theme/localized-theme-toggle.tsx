import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "./theme-toggle";

/** Server wrapper: passes translated labels to the client toggle. */
export async function LocalizedThemeToggle() {
  const t = await getTranslations("theme");
  return (
    <ThemeToggle
      labels={{ toggle: t("toggle"), light: t("light"), dark: t("dark"), system: t("system") }}
    />
  );
}
