import type { ComponentProps, ComponentType } from "react";
import { Link } from "@/i18n/navigation";

/**
 * The localized Link forwards extra props to Next's App Router Link, which also
 * accepts `unstable_dynamicOnHover` (Next 15.3+); its typings don't list it.
 */
const HoverPrefetchLink = Link as ComponentType<
  ComponentProps<typeof Link> & { unstable_dynamicOnHover?: boolean }
>;

/**
 * A localized Link that fetches the whole page (data included) as soon as the
 * pointer hovers it or a finger touches it, so the click itself navigates instantly.
 *
 * For links to dynamic pages without a loading.tsx (the catalog listings).
 * `prefetch={true}` would do the same on *viewport*, rendering every visible
 * listing link on every page view; on intent it costs one render per likely click.
 * The unstable option is used only here, so a rename is a one-line change.
 */
export function IntentLink(props: ComponentProps<typeof Link>) {
  return <HoverPrefetchLink unstable_dynamicOnHover {...props} />;
}
