/**
 * next-intl for tests: components and server code get real English messages
 * without a NextIntlClientProvider or a Next.js request. Imported by both
 * Vitest setup files.
 */
import { createTranslator } from "next-intl";
import type * as NextIntl from "next-intl";
import type * as NextIntlServer from "next-intl/server";
import { vi } from "vitest";
import messages from "../../messages/en.json";

function translator(namespace?: string) {
  // Namespaces come from the code under test, typed there; here any string goes.
  return createTranslator({
    locale: "en",
    messages,
    namespace: namespace as never,
    timeZone: "America/New_York",
  });
}

vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal<typeof NextIntl>()),
  useTranslations: (namespace?: string) => translator(namespace),
  useLocale: () => "en",
}));

vi.mock("next-intl/server", async (importOriginal) => ({
  ...(await importOriginal<typeof NextIntlServer>()),
  getTranslations: async (options?: string | { namespace?: string }) =>
    translator(typeof options === "string" ? options : options?.namespace),
  getLocale: async () => "en",
  setRequestLocale: () => {},
}));
