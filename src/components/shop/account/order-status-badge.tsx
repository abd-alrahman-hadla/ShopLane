import type { OrderStatus } from "@/generated/prisma/client";
import { orderStatusInfo, type StatusTone } from "@/features/account/orders";
import { cn } from "@/lib/utils";

const TONES: Record<StatusTone, string> = {
  neutral: "bg-muted text-foreground",
  info: "bg-sky-100 text-sky-900",
  success: "bg-emerald-100 text-emerald-900",
  danger: "bg-red-100 text-red-900",
};

export function OrderStatusBadge({
  status,
  cancelReason,
}: {
  status: OrderStatus;
  cancelReason: string | null;
}) {
  const info = orderStatusInfo(status, cancelReason);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[info.tone],
      )}
      data-testid="order-status-badge"
    >
      {info.label}
    </span>
  );
}
