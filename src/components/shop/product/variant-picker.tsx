"use client";

import type { VariantOption } from "@/features/catalog/types";
import {
  getAxisValues,
  getOptionValues,
  selectOption,
  type OptionAxis,
} from "@/features/catalog/variants";
import { cn } from "@/lib/utils";

type VariantPickerProps = {
  variants: VariantOption[];
  selected: VariantOption;
  onSelect: (variant: VariantOption) => void;
};

const AXIS_LABELS: Record<OptionAxis, string> = { size: "Size", color: "Color" };

/**
 * Size/color picker. Combinations that don't exist are disabled. Sold-out
 * combinations stay selectable (so shoppers can see them) but are struck through.
 */
export function VariantPicker({ variants, selected, onSelect }: VariantPickerProps) {
  const axes = (["size", "color"] as const).filter(
    (axis) => getAxisValues(variants, axis).length > 0,
  );

  return (
    <div className="flex flex-col gap-5">
      {axes.map((axis) => (
        <fieldset key={axis} className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm">
            <span className="font-medium">{AXIS_LABELS[axis]}:</span>{" "}
            <span className="text-muted-foreground">{selected[axis] ?? "-"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {getOptionValues(variants, selected, axis).map((option) => {
              const isSelected = selected[axis] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={!option.exists}
                  aria-pressed={isSelected}
                  aria-label={`${AXIS_LABELS[axis]} ${option.value}${option.exists && !option.inStock ? " (sold out)" : ""}`}
                  onClick={() => onSelect(selectOption(variants, selected, axis, option.value))}
                  className={cn(
                    "focus-visible:ring-ring/50 min-w-14 rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-3",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:border-foreground/40",
                    option.exists && !option.inStock && "line-through decoration-1",
                    !option.exists && "cursor-not-allowed opacity-35",
                  )}
                >
                  {option.value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
