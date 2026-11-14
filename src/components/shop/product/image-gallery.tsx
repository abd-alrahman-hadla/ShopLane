"use client";

import Image from "next/image";
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

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted relative aspect-square overflow-hidden rounded-2xl">
        {active ? (
          <Image
            key={active.id}
            src={active.url}
            alt={active.alt}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            data-testid="gallery-main"
          />
        ) : (
          <span className="text-muted-foreground absolute inset-0 grid place-items-center text-sm">
            No image
          </span>
        )}
      </div>
      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2" aria-label={`${productName} images`}>
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-label={`Show image ${index + 1}: ${image.alt}`}
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
