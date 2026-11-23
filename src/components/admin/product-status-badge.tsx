import { useTranslations } from "next-intl";
import type { ProductStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

const STYLES: Record<ProductStatus, string> = {
  ACTIVE: "bg-success-soft text-success-strong",
  DRAFT: "bg-muted text-foreground",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const t = useTranslations("admin.products.statusLabel");
  return (
    <span
      className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", STYLES[status])}
    >
      {t(status)}
    </span>
  );
}
