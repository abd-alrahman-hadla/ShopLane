export type SeedCoupon = {
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  /** Percent for PERCENTAGE, cents for FIXED_AMOUNT. */
  value: number;
  minSubtotalCents?: number;
};

export const coupons: SeedCoupon[] = [
  { code: "WELCOME10", type: "PERCENTAGE", value: 10 },
  { code: "BREW5", type: "FIXED_AMOUNT", value: 500, minSubtotalCents: 4000 },
];
