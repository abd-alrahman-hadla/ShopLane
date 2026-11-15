import { z } from "zod";
import { MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from "./cart";

/**
 * Cart input from the browser. `.strict()` rejects any extra field, so a
 * tampered request carrying prices or totals is refused outright.
 */
export const cartItemSchema = z
  .object({
    variantId: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
  })
  .strict();

export const cartItemsSchema = z.array(cartItemSchema).max(MAX_CART_LINES);

export const couponCodeInputSchema = z.string().trim().max(40).nullish();

export const cartQuoteInputSchema = z
  .object({
    items: cartItemsSchema,
    couponCode: couponCodeInputSchema,
  })
  .strict();

export type CartQuoteInput = z.infer<typeof cartQuoteInputSchema>;
