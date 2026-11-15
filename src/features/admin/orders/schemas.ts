import { z } from "zod";
import { CARRIERS } from "./transitions";

const id = z.string().min(1).max(40);

export const orderIdInputSchema = z.object({ orderId: id }).strict();

export const shipOrderSchema = z
  .object({
    orderId: id,
    carrier: z.enum(CARRIERS),
    trackingNumber: z
      .string()
      .trim()
      .min(4, "Enter the tracking number.")
      .max(60, "That tracking number is too long.")
      .regex(/^[A-Za-z0-9 -]+$/, "Letters, digits, spaces and dashes only."),
  })
  .strict();

export const REFUND_REASONS = ["requested_by_customer", "duplicate", "fraudulent"] as const;

export const refundOrderSchema = z
  .object({
    orderId: id,
    /** Generated once per refund dialog; makes double submits refund only once. */
    requestId: z.uuid(),
    amountCents: z.number().int().positive("Enter an amount above $0."),
    reason: z.enum(REFUND_REASONS),
    note: z.string().trim().max(200).optional().default(""),
    restock: z
      .array(z.object({ orderItemId: id, quantity: z.number().int().min(0).max(100) }).strict())
      .max(50)
      .default([]),
  })
  .strict();

export type RefundOrderInput = z.infer<typeof refundOrderSchema>;
