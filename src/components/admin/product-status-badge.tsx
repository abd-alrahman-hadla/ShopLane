import type { ProductStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

const STYLES: Record<ProductStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-900",
  DRAFT: "bg-muted text-foreground",
  ARCHIVED: "bg-zinc-200 text-zinc-700",
};

const LABELS: Record<ProductStatus, string> = {
  ACTIVE: "Active",
  DRAFT: "Draft",
  ARCHIVED: "Archived",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", STYLES[status])}
    >
      {LABELS[status]}
    </span>
  );
}
