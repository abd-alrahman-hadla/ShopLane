import { z } from "zod";

const optionalDate = z
  .union([z.date(), z.iso.datetime({ offset: true }), z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value ? new Date(value) : null));

const optionalPositiveInt = z
  .number()
  .int()
  .positive()
  .nullish()
  .transform((value) => value ?? null);

/**
 * Coupon form. `value` is a percent (1–100) for PERCENTAGE and cents for
 * FIXED_AMOUNT; the form converts dollars to cents before sending.
 */
export const couponFormSchema = z
  .object({
    id: z.string().min(1).max(40).nullish(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,32}$/, "3–32 letters, digits, dashes or underscores."),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    value: z.number().int().positive("Enter a value above 0."),
    minSubtotalCents: optionalPositiveInt,
    maxRedemptions: optionalPositiveInt,
    startsAt: optionalDate,
    endsAt: optionalDate,
    isActive: z.boolean(),
  })
  .strict()
  .superRefine((coupon, ctx) => {
    if (coupon.type === "PERCENTAGE" && coupon.value > 100) {
      ctx.addIssue({ code: "custom", message: "A percentage can't exceed 100.", path: ["value"] });
    }
    if (coupon.type === "FIXED_AMOUNT" && coupon.value > 1_000_000) {
      ctx.addIssue({ code: "custom", message: "That discount is too large.", path: ["value"] });
    }
    if (coupon.startsAt && coupon.endsAt && coupon.endsAt <= coupon.startsAt) {
      ctx.addIssue({
        code: "custom",
        message: "The end must be after the start.",
        path: ["endsAt"],
      });
    }
  });

export type CouponFormInput = z.input<typeof couponFormSchema>;
export type CouponFormData = z.output<typeof couponFormSchema>;

export const couponIdSchema = z.object({ couponId: z.string().min(1).max(40) }).strict();
export const couponActiveSchema = z
  .object({ couponId: z.string().min(1).max(40), isActive: z.boolean() })
  .strict();
