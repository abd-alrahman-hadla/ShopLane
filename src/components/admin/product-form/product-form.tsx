"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { saveProduct } from "@/features/admin/products/actions";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, slugify } from "@/features/admin/products/schemas";
import { getPathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
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

/** Server field paths → form field paths (prices are strings in the form; Arabic is nested). */
function toFormPath(path: string): Path<ProductFormValues> {
  return path
    .replace(/\.priceCents$/, ".price")
    .replace(/\.compareAtPriceCents$/, ".compareAt")
    .replace(/^translations\.ar\./, "arabic.") as Path<ProductFormValues>;
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
  const t = useTranslations("admin.productForm");
  const router = useRouter();
  const locale = useLocale() as Locale;
  const ids = {
    name: useId(),
    slug: useId(),
    description: useId(),
    category: useId(),
    status: useId(),
    featured: useId(),
    seoTitle: useId(),
    seoDescription: useId(),
    arName: useId(),
    arDescription: useId(),
    arSeoTitle: useId(),
    arSeoDescription: useId(),
  };
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const [contentTab, setContentTab] = useState("en");

  const { register, control, handleSubmit, setValue, setError, clearErrors, reset, formState } =
    useForm<ProductFormValues>({
      defaultValues: toFormValues(product, categories[0]?.id ?? ""),
    });
  const { errors } = formState;
  const [name, slug, description, seoTitle, seoDescription, arSeoTitle, arSeoDescription] =
    useWatch({
      control,
      name: [
        "name",
        "slug",
        "description",
        "seoTitle",
        "seoDescription",
        "arabic.seoTitle",
        "arabic.seoDescription",
      ],
    });

  function applyErrors(fieldErrors: Record<string, string>): void {
    for (const [path, message] of Object.entries(fieldErrors)) {
      if (path === "_") continue;
      setError(toFormPath(path), { type: "server", message });
    }
    // Show the tab that holds the problem.
    if (Object.keys(fieldErrors).some((path) => path.startsWith("translations."))) {
      setContentTab("ar");
    }
  }

  const onSubmit = handleSubmit((values) => {
    clearErrors();
    setFormError(null);
    setSavedMessage(null);
    const converted = toPayload(values);
    if (!converted.ok) {
      applyErrors(converted.fieldErrors);
      setFormError(t("fixFields"));
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
        // A full load, not router.replace: on Next 15.5 this client navigation
        // downloads the new page but never commits it (same bug as the store → admin link).
        window.location.assign(
          getPathname({ href: `/admin/products/${result.data.id}?created=1`, locale }),
        );
        return;
      }
      // Reset to what was saved (new variant IDs, normalized SKUs) without remounting,
      // so the confirmation stays visible; refresh updates the history panel.
      reset(toFormValues(result.data.product, categories[0]?.id ?? ""));
      setSavedMessage(t("saved"));
      router.refresh();
    });
  });

  const previewTitle = (seoTitle || name || t("namePlaceholder")).slice(0, 70);
  const previewDescription = (seoDescription || description || "").slice(0, 160);
  const arabicError = (field: keyof ProductFormValues["arabic"]) => errors.arabic?.[field]?.message;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate data-testid="product-form">
      <Section title={t("basics")}>
        <Tabs value={contentTab} onValueChange={setContentTab}>
          <TabsList aria-label={t("contentLanguage")}>
            <TabsTrigger value="en" lang="en">
              English
            </TabsTrigger>
            <TabsTrigger value="ar" lang="ar" data-testid="arabic-tab">
              العربية
              {errors.arabic && (
                <span className="bg-destructive ms-1 inline-block size-1.5 rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="en" className="mt-4 flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.name}>{t("name")}</Label>
                <Input
                  id={ids.name}
                  aria-invalid={errors.name ? true : undefined}
                  {...register("name", {
                    required: t("nameRequired"),
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                      if (!slugEdited) setValue("slug", slugify(event.target.value));
                    },
                  })}
                />
                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.slug}>{t("slug")}</Label>
                <Input
                  id={ids.slug}
                  dir="ltr"
                  aria-invalid={errors.slug ? true : undefined}
                  aria-describedby={`${ids.slug}-hint`}
                  {...register("slug", {
                    required: t("slugRequired"),
                    onChange: () => setSlugEdited(true),
                  })}
                />
                <p id={`${ids.slug}-hint`} className="text-muted-foreground text-xs">
                  <span dir="ltr">/products/{slug || "…"}</span>
                  {product && product.slug !== slug && ` · ${t("slugChanged")}`}
                </p>
                {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.description}>{t("description")}</Label>
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
          </TabsContent>

          <TabsContent value="ar" className="mt-4 flex flex-col gap-4" lang="ar" dir="rtl">
            <p className="text-muted-foreground text-sm" dir="auto">
              {t("arabicHint")}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.arName}>{t("arName")}</Label>
              <Input
                id={ids.arName}
                aria-invalid={arabicError("name") ? true : undefined}
                {...register("arabic.name")}
              />
              {arabicError("name") && (
                <p className="text-destructive text-sm">{arabicError("name")}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.arDescription}>{t("arDescription")}</Label>
              <Textarea id={ids.arDescription} rows={5} {...register("arabic.description")} />
              {arabicError("description") && (
                <p className="text-destructive text-sm">{arabicError("description")}</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.arSeoTitle}>{t("arSeoTitle")}</Label>
                <Input
                  id={ids.arSeoTitle}
                  maxLength={SEO_TITLE_MAX}
                  {...register("arabic.seoTitle")}
                />
                <p className="text-muted-foreground text-xs tabular-nums">
                  {arSeoTitle.length}/{SEO_TITLE_MAX}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.arSeoDescription}>{t("arSeoDescription")}</Label>
                <Textarea
                  id={ids.arSeoDescription}
                  rows={3}
                  maxLength={SEO_DESCRIPTION_MAX}
                  {...register("arabic.seoDescription")}
                />
                <p className="text-muted-foreground text-xs tabular-nums">
                  {arSeoDescription.length}/{SEO_DESCRIPTION_MAX}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.category}>{t("category")}</Label>
            <select id={ids.category} className={selectClass} {...register("categoryId")}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.status}>{t("status")}</Label>
            <select id={ids.status} className={selectClass} {...register("status")}>
              <option value="DRAFT">{t("statusDraft")}</option>
              <option value="ACTIVE">{t("statusActive")}</option>
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
            <Label htmlFor={ids.featured}>{t("featured")}</Label>
          </div>
        </div>
      </Section>

      <Section title={t("variants")} description={t("variantsHint")}>
        <VariantsEditor control={control} register={register} errors={errors} />
      </Section>

      <Section title={t("images")} description={t("imagesHint")}>
        <ImagesEditor control={control} register={register} errors={errors} />
      </Section>

      <Section title={t("seo")} description={t("seoHint")}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.seoTitle}>{t("seoTitle")}</Label>
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
            <Label htmlFor={ids.seoDescription}>{t("seoDescription")}</Label>
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
        <div className="rounded-lg border p-3" aria-label={t("seoPreview")} dir="ltr">
          <p className="text-muted-foreground text-xs">shoplane.example/products/{slug || "…"}</p>
          <p className="text-info text-lg">{previewTitle} · ShopLane</p>
          <p className="text-muted-foreground text-sm">{previewDescription}</p>
        </div>
      </Section>

      <div className="bg-background/95 sticky bottom-0 flex flex-wrap items-center gap-3 border-t py-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? t("saving") : product ? t("saveChanges") : t("create")}
        </Button>
        {formError && (
          <p className="text-destructive text-sm" role="alert">
            {formError}
          </p>
        )}
        {savedMessage && (
          <p className="text-success text-sm" role="status">
            {savedMessage}
          </p>
        )}
      </div>
    </form>
  );
}
