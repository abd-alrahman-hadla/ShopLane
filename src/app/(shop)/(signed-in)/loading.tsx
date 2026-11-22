import { PageSkeleton } from "@/components/shop/page-skeleton";

/**
 * Above the account layout (which checks the session), so entering the account
 * area shows this immediately. Listing pages deliberately have no loading.tsx
 * (see the Rendering & caching notes); this group only wraps signed-in pages.
 */
export default function SignedInLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PageSkeleton />
    </div>
  );
}
