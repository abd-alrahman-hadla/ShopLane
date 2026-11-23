"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { ProductImageData } from "@/features/catalog/types";
import { cn } from "@/lib/utils";

type ImageGalleryProps = {
  images: ProductImageData[];
  activeIndex: number;
  onSelect: (index: number) => void;
  productName: string;
};

export function ImageGallery({ images, activeIndex, onSelect, productName }: ImageGalleryProps) {
  const active = images[activeIndex] ?? images[0];
  const t = useTranslations("product");
  // Stored alt text is English; other languages describe photos by product name.
  const english = useLocale() === "en";
  const altFor = (image: ProductImageData, index: number) =>
    english ? image.alt : t("photoNumber", { name: productName, number: index + 1 });
  const activePosition = active ? images.indexOf(active) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted relative aspect-square overflow-hidden rounded-2xl">
        {active ? (
          <Image
            key={active.id}
            src={active.url}
            alt={altFor(active, activePosition)}
            fill
            priority
            fetchPriority="high"
            // The page is capped at max-w-7xl, so the gallery never exceeds ~600px.
            sizes="(min-width: 1280px) 600px, (min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            data-testid="gallery-main"
          />
        ) : (
          <span className="text-muted-foreground absolute inset-0 grid place-items-center text-sm">
            {t("noImage")}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2" aria-label={t("images", { name: productName })}>
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-label={t("showImage", { number: index + 1, alt: altFor(image, index) })}
                aria-pressed={index === activeIndex}
                className={cn(
                  "bg-muted focus-visible:ring-ring/50 relative block aspect-square w-full overflow-hidden rounded-lg border-2 outline-none focus-visible:ring-3",
                  index === activeIndex
                    ? "border-primary"
                    : "border-transparent opacity-80 hover:opacity-100",
                )}
              >
                <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
