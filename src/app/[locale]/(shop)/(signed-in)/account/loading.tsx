import { PageSkeleton } from "@/components/shop/page-skeleton";

/** Moving between account pages keeps the layout and nav; only the content waits. */
export default function AccountLoading() {
  return <PageSkeleton />;
}
