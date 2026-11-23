"use client";

import Image from "next/image";
import { useId, useRef, useState, type ChangeEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, ImagePlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_IMAGES, isAllowedImageUrl } from "@/features/admin/products/schemas";
import { useUploadThing } from "@/lib/uploadthing";
import { rowKey, type ProductFormValues } from "./form-values";

type ImagesEditorProps = {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
};

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2 text-sm outline-none focus-visible:ring-3";

function SortableImage({
  index,
  itemKey,
  total,
  control,
  register,
  errors,
  onRemove,
  skus,
}: {
  index: number;
  itemKey: string;
  total: number;
  onRemove: () => void;
  skus: string[];
} & ImagesEditorProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: itemKey,
  });
  const url = useWatch({ control, name: `images.${index}.url` });
  const altError = errors.images?.[index]?.alt?.message;
  const altId = useId();
  const t = useTranslations("admin.images");

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-card flex flex-col gap-2 rounded-xl border p-2 ${isDragging ? "z-10 shadow-lg ring-2 ring-[var(--ring)]" : ""}`}
      data-testid="image-row"
    >
      <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
        {isAllowedImageUrl(url) && (
          <Image src={url} alt="" fill sizes="160px" className="object-cover" />
        )}
        <span className="bg-background/90 absolute start-1 top-1 rounded px-1.5 text-xs font-medium tabular-nums">
          {index === 0 ? t("main") : index + 1}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={t("reorder", { number: index + 1, total })}
          className="hover:bg-muted focus-visible:ring-ring/50 flex size-8 cursor-grab touch-none items-center justify-center rounded-md outline-none focus-visible:ring-3 active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4" aria-hidden />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={t("remove", { number: index + 1 })}
        >
          <Trash2Icon />
        </Button>
      </div>
      <label htmlFor={altId} className="sr-only">
        {t("altLabel", { number: index + 1 })}
      </label>
      <Input
        id={altId}
        placeholder={t("altPlaceholder")}
        aria-invalid={altError ? true : undefined}
        {...register(`images.${index}.alt`, { required: t("altRequired") })}
      />
      {altError && <p className="text-destructive text-xs">{altError}</p>}
      <select
        aria-label={t("variantFor", { number: index + 1 })}
        className={selectClass}
        {...register(`images.${index}.variantSku`)}
      >
        <option value="">{t("allVariants")}</option>
        {skus.map((sku) => (
          <option key={sku} value={sku}>
            {sku}
          </option>
        ))}
      </select>
    </li>
  );
}

/** Upload (UploadThing) or link images; drag, touch or keyboard to reorder. The first image is the main one. */
export function ImagesEditor({ control, register, errors }: ImagesEditorProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "images",
    keyName: "_rhfKey",
  });
  const variants = useWatch({ control, name: "variants" });
  const skus = (variants ?? []).map((variant) => variant.sku.trim().toUpperCase()).filter(Boolean);
  const fileInput = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const t = useTranslations("admin.images");

  const { startUpload, isUploading } = useUploadThing("productImage", {
    onClientUploadComplete: (files) => {
      for (const file of files) {
        append({
          key: rowKey("img"),
          url: file.serverData?.url ?? file.ufsUrl,
          alt: "",
          variantSku: "",
        });
      }
      setMessage(t("uploaded", { count: files.length }));
    },
    onUploadError: (error) => setMessage(t("uploadFailed", { message: error.message })),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const position = (id: string | number) => fields.findIndex((field) => field.key === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("dragStart", { number: position(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t("dragOver", { number: position(active.id), target: position(over.id) })
        : t("dragOut", { number: position(active.id) }),
    onDragEnd: ({ active, over }) =>
      over
        ? t("dragEnd", { target: position(over.id) })
        : t("dropped", { number: position(active.id) }),
    onDragCancel: ({ active }) => t("dragCancel", { number: position(active.id) }),
  };

  function handleDragEnd({ active, over }: DragEndEvent): void {
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((field) => field.key === active.id);
    const to = fields.findIndex((field) => field.key === over.id);
    if (from >= 0 && to >= 0) move(from, to);
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = [...(event.target.files ?? [])].slice(0, MAX_IMAGES - fields.length);
    event.target.value = "";
    if (files.length === 0) return;
    setMessage(null);
    await startUpload(files);
  }

  function addUrl(): void {
    const url = urlDraft.trim();
    if (!isAllowedImageUrl(url)) {
      setMessage(t("badUrl"));
      return;
    }
    append({ key: rowKey("img"), url, alt: "", variantSku: "" });
    setUrlDraft("");
    setMessage(null);
  }

  const full = fields.length >= MAX_IMAGES;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleFiles}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isUploading || full}
          onClick={() => fileInput.current?.click()}
        >
          <UploadIcon data-icon="inline-start" />
          {isUploading ? t("uploading") : t("upload")}
        </Button>
        <div className="flex min-w-64 flex-1 gap-2">
          <Input
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            placeholder={t("urlPlaceholder")}
            aria-label={t("urlLabel")}
            dir="ltr"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addUrl();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addUrl} disabled={full}>
            <ImagePlusIcon data-icon="inline-start" />
            {t("add")}
          </Button>
        </div>
      </div>
      {message && (
        <p className="text-muted-foreground text-sm" role="status">
          {message}
        </p>
      )}
      {fields.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          {t("none")}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{ announcements }}
        >
          <SortableContext items={fields.map((field) => field.key)} strategy={rectSortingStrategy}>
            <ul
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              aria-label={t("listLabel")}
            >
              {fields.map((field, index) => (
                <SortableImage
                  key={field.key}
                  itemKey={field.key}
                  index={index}
                  total={fields.length}
                  control={control}
                  register={register}
                  errors={errors}
                  skus={skus}
                  onRemove={() => remove(index)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
