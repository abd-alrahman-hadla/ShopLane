import { generateReactHelpers } from "@uploadthing/react";
import type { UploadRouter } from "@/app/api/uploadthing/core";

/** Typed client hooks for the upload routes (we render our own buttons; no UploadThing CSS). */
export const { useUploadThing } = generateReactHelpers<UploadRouter>();
