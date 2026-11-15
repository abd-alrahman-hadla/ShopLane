import { createRouteHandler } from "uploadthing/next";
import { uploadRouter } from "./core";

// UPLOADTHING_TOKEN is read from the environment by UploadThing itself.
export const { GET, POST } = createRouteHandler({ router: uploadRouter });
