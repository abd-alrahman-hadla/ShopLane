import { useTranslations } from "next-intl";
import type { OrderStatus } from "@/generated/prisma/client";
import { orderStatusInfo, type StatusTone } from "@/features/account/orders";
import { cn } from "@/lib/utils";

const TONES: Record<StatusTone, string> = {
  neutral: "bg-muted text-foreground",
  info: "bg-info-soft text-info-strong",
  success: "bg-success-soft text-success-strong",
  danger: "bg-danger-soft text-danger-strong",
};

export function OrderStatusBadge({
  status,
  cancelReason,
}: {
  status: OrderStatus;
  cancelReason: string | null;
}) {
  const info = orderStatusInfo(status, cancelReason);
  const t = useTranslations("orderStatus");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[info.tone],
      )}
      data-testid="order-status-badge"
    >
      {t(`label.${status}`)}
    </span>
  );
}
