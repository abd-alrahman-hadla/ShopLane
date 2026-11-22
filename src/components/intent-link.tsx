import Link from "next/link";
import type { ComponentProps, ComponentType } from "react";

/**
 * `next/link`'s typings come from the Pages Router Link; the App Router Link it
 * resolves to at runtime also accepts `unstable_dynamicOnHover` (Next 15.3+).
 */
const AppRouterLink = Link as ComponentType<
  ComponentProps<typeof Link> & { unstable_dynamicOnHover?: boolean }
>;

/**
 * A Link that fetches the whole page (data included) as soon as the pointer
 * hovers it or a finger touches it, so the click itself navigates instantly.
 *
 * For links to dynamic pages without a loading.tsx (the catalog listings).
 * `prefetch={true}` would do the same on *viewport*, rendering every visible
 * listing link on every page view; on intent it costs one render per likely click.
 * The unstable option is used only here, so a rename is a one-line change.
 */
export function IntentLink(props: ComponentProps<typeof Link>) {
  return <AppRouterLink unstable_dynamicOnHover {...props} />;
}
