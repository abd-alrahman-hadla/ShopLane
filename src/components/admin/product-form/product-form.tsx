"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveProduct } from "@/features/admin/products/actions";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, slugify } from "@/features/admin/products/schemas";
import {
  toFormValues,
  toPayload,
  type EditableProduct,
  type ProductFormValues,
} from "./form-values";
import { ImagesEditor } from "./images-editor";
import { VariantsEditor } from "./variants-editor";

type ProductFormProps = {
  product: EditableProduct | null;
  categories: Array<{ id: string; name: string }>;
};

/** Server field paths (cents) → form field paths (price strings). */
function toFormPath(path: string): Path<ProductFormValues> {
  return path
    .replace(/\.priceCents$/, ".price")
    .replace(/\.compareAtPriceCents$/, ".compareAt") as Path<ProductFormValues>;
}

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
      <div>
        <h2 className="font-medium">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter();
  const ids = {
    name: useId(),
    slug: useId(),
    description: useId(),
    category: useId(),
    status: useId(),
    featured: useId(),
    seoTitle: useId(),
    seoDescription: useId(),
  };
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(Boolean(product));

  const { register, control, handleSubmit, setValue, setError, clearErrors, reset, formState } =
    useForm<ProductFormValues>({
      defaultValues: toFormValues(product, categories[0]?.id ?? ""),
    });
  const { errors } = formState;
  const [name, slug, description, seoTitle, seoDescription] = useWatch({
    control,
    name: ["name", "slug", "description", "seoTitle", "seoDescription"],
  });

  function applyErrors(fieldErrors: Record<string, string>): void {
    for (const [path, message] of Object.entries(fieldErrors)) {
      if (path === "_") continue;
      setError(toFormPath(path), { type: "server", message });
    }
  }

  const onSubmit = handleSubmit((values) => {
    clearErrors();
    setFormError(null);
    setSavedMessage(null);
    const converted = toPayload(values);
    if (!converted.ok) {
      applyErrors(converted.fieldErrors);
      setFormError("Please fix the highlighted fields.");
      return;
    }
    startTransition(async () => {
      const result = await saveProduct(converted.payload);
      if (!result.ok) {
        if (result.fieldErrors) applyErrors(result.fieldErrors);
        setFormError(result.error);
        return;
      }
      if (!product) {
        router.replace(`/admin/products/${result.data.id}?created=1`);
        return;
      }
      // Reset to what was saved (new variant IDs, normalized SKUs) without remounting,
      // so the confirmation stays visible; refresh updates the history panel.
      reset(toFormValues(result.data.product, categories[0]?.id ?? ""));
      setSavedMessage("Saved.");
      router.refresh();
    });
  });

  const previewTitle = (seoTitle || name || "Product name").slice(0, 70);
  const previewDescription = (seoDescription || description || "").slice(0, 160);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate data-testid="product-form">
      <Section title="Basics">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.name}>Name</Label>
            <Input
              id={ids.name}
              aria-invalid={errors.name ? true : undefined}
              {...register("name", {
                required: "Name is required.",
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  if (!slugEdited) setValue("slug", slugify(event.target.value));
                },
              })}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.slug}>URL slug</Label>
            <Input
              id={ids.slug}
              aria-invalid={errors.slug ? true : undefined}
              aria-describedby={`${ids.slug}-hint`}
              {...register("slug", {
                required: "Slug is required.",
                onChange: () => setSlugEdited(true),
              })}
            />
            <p id={`${ids.slug}-hint`} className="text-muted-foreground text-xs">
              /products/{slug || "…"}
              {product && product.slug !== slug && " · the old URL will stop working"}
            </p>
            {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.description}>Description</Label>
          <Textarea
            id={ids.description}
            rows={5}
            aria-invalid={errors.description ? true : undefined}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-destructive text-sm">{errors.description.message}</p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.category}>Category</Label>
            <select id={ids.category} className={selectClass} {...register("categoryId")}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.status}>Status</Label>
            <select id={ids.status} className={selectClass} {...register("status")}>
              <option value="DRAFT">Draft (hidden from the store)</option>
              <option value="ACTIVE">Active (on sale)</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pb-1.5">
            <Controller
              control={control}
              name="featured"
              render={({ field }) => (
                <Switch id={ids.featured} checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor={ids.featured}>Featured on the home page</Label>
          </div>
        </div>
      </Section>

      <Section
        title="Variants"
        description="Prices in dollars. Variants that appear in past orders can't be removed."
      >
        <VariantsEditor control={control} register={register} errors={errors} />
      </Section>

      <Section
        title="Images"
        description="Drag (or use the handle with Space and the arrow keys) to reorder. The first image is the main one."
      >
        <ImagesEditor control={control} register={register} errors={errors} />
      </Section>

      <Section
        title="Search engine listing"
        description="Optional. Falls back to the name and description."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.seoTitle}>SEO title</Label>
            <Input
              id={ids.seoTitle}
              maxLength={SEO_TITLE_MAX}
              aria-invalid={errors.seoTitle ? true : undefined}
              {...register("seoTitle")}
            />
            <p className="text-muted-foreground text-xs tabular-nums">
              {seoTitle.length}/{SEO_TITLE_MAX}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.seoDescription}>Meta description</Label>
            <Textarea
              id={ids.seoDescription}
              rows={3}
              maxLength={SEO_DESCRIPTION_MAX}
              aria-invalid={errors.seoDescription ? true : undefined}
              {...register("seoDescription")}
            />
            <p className="text-muted-foreground text-xs tabular-nums">
              {seoDescription.length}/{SEO_DESCRIPTION_MAX}
            </p>
          </div>
        </div>
        <div className="rounded-lg border p-3" aria-label="Search result preview">
          <p className="text-muted-foreground text-xs">shoplane.example/products/{slug || "…"}</p>
          <p className="text-lg text-sky-800">{previewTitle} · ShopLane</p>
          <p className="text-muted-foreground text-sm">{previewDescription}</p>
        </div>
      </Section>

      <div className="bg-background/95 sticky bottom-0 flex flex-wrap items-center gap-3 border-t py-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
        {formError && (
          <p className="text-destructive text-sm" role="alert">
            {formError}
          </p>
        )}
        {savedMessage && (
          <p className="text-sm text-emerald-700" role="status">
            {savedMessage}
          </p>
        )}
      </div>
    </form>
  );
}
