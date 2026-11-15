import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getAdminFromRequest } from "@/features/admin/guard";
import { db } from "@/lib/db";

const f = createUploadthing();

export const uploadRouter = {
  /** Product photos, admins only. Saved to a product only when the product form is saved. */
  productImage: f({ image: { maxFileSize: "4MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      // Reads the session from the request itself rather than Next's request
      // context, because this handler runs inside Effect fibers.
      const admin = await getAdminFromRequest(db, req);
      if (!admin) throw new UploadThingError("Only admins can upload product images.");
      return { adminId: admin.id };
    })
    .onUploadComplete(({ file, metadata }) => ({ url: file.ufsUrl, uploadedBy: metadata.adminId })),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
