import { z } from "zod";
import { MAX_RATING, MIN_RATING } from "./rating";

export const REVIEW_BODY_MIN = 10;
export const REVIEW_BODY_MAX = 2000;

export const reviewInputSchema = z
  .object({
    productId: z.string().min(1).max(40),
    rating: z.number().int().min(MIN_RATING).max(MAX_RATING),
    body: z
      .string()
      .trim()
      .min(REVIEW_BODY_MIN, `Please write at least ${REVIEW_BODY_MIN} characters.`)
      .max(REVIEW_BODY_MAX, `Please keep it under ${REVIEW_BODY_MAX} characters.`),
  })
  .strict();

export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const productIdSchema = z.string().min(1).max(40);
