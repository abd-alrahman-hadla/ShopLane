"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_VARIANTS } from "@/features/admin/products/schemas";
import { emptyVariant, type ProductFormValues } from "./form-values";

type VariantsEditorProps = {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
};

const COLUMNS = [
  { field: "sku", label: "SKU", placeholder: "SO-KEN-250", className: "w-36" },
  { field: "title", label: "Title", placeholder: "250 g", className: "w-36" },
  { field: "size", label: "Size", placeholder: "250 g", className: "w-24" },
  { field: "color", label: "Color", placeholder: "—", className: "w-24" },
  {
    field: "price",
    label: "Price ($)",
    placeholder: "21.00",
    className: "w-24",
    inputMode: "decimal",
  },
  {
    field: "compareAt",
    label: "Compare at ($)",
    placeholder: "—",
    className: "w-24",
    inputMode: "decimal",
  },
  { field: "stock", label: "Stock", placeholder: "0", className: "w-20", inputMode: "numeric" },
] as const;

export function VariantsEditor({ control, register, errors }: VariantsEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
    keyName: "_rhfKey",
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="variants-table">
          <thead className="text-muted-foreground text-left text-xs">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.field} scope="col" className="px-1 pb-2 font-normal">
                  {column.label}
                </th>
              ))}
              <th scope="col" className="pb-2">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const rowErrors = errors.variants?.[index];
              return (
                <tr key={field.key} className="align-top">
                  {COLUMNS.map((column) => (
                    <td key={column.field} className="p-1">
                      <Input
                        aria-label={`${column.label}, variant ${index + 1}`}
                        placeholder={column.placeholder}
                        inputMode={"inputMode" in column ? column.inputMode : undefined}
                        className={column.className}
                        aria-invalid={rowErrors?.[column.field] ? true : undefined}
                        {...register(`variants.${index}.${column.field}`)}
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={fields.length === 1 || field.orderCount > 0}
                      title={
                        field.orderCount > 0
                          ? "In past orders: set stock to 0 instead"
                          : "Remove variant"
                      }
                      aria-label={
                        field.orderCount > 0
                          ? `Variant ${index + 1} is in past orders and can't be removed`
                          : `Remove variant ${index + 1}`
                      }
                      onClick={() => remove(index)}
                    >
                      <Trash2Icon />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <VariantErrors errors={errors} />
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={fields.length >= MAX_VARIANTS}
        onClick={() => append(emptyVariant())}
      >
        <PlusIcon data-icon="inline-start" />
        Add variant
      </Button>
    </div>
  );
}

/** Visible list of variant problems (row-scoped), so errors aren't conveyed by red borders alone. */
function VariantErrors({ errors }: { errors: FieldErrors<ProductFormValues> }) {
  const rows = errors.variants;
  const list: string[] = [];
  if (rows && typeof rows === "object") {
    if ("message" in rows && typeof rows.message === "string") list.push(rows.message);
    Object.entries(rows).forEach(([index, row]) => {
      if (!/^\d+$/.test(index) || !row || typeof row !== "object") return;
      for (const [field, error] of Object.entries(row as Record<string, { message?: string }>)) {
        if (error?.message) list.push(`Row ${Number(index) + 1} ${field}: ${error.message}`);
      }
    });
  }
  if (list.length === 0) return null;
  return (
    <ul className="text-destructive flex flex-col gap-0.5 text-sm" role="alert">
      {list.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}
