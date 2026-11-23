import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

/** Shown the instant a link is clicked, while a dynamic page streams in. */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  const t = useTranslations("common");
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="mt-2 flex flex-col gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
