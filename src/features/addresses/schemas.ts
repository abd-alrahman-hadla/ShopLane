import { z } from "zod";

export const MAX_ADDRESSES = 10;

/** US state and territory codes accepted for shipping. */
export const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "PR",
] as const;

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

/** A US shipping address. Empty optional fields become null. */
export const addressInputSchema = z
  .object({
    fullName: requiredText("Full name", 100),
    line1: requiredText("Address", 120),
    line2: optionalText(120),
    city: requiredText("City", 80),
    region: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => (US_STATES as readonly string[]).includes(value), "Choose a US state."),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code (or ZIP+4)."),
    phone: optionalText(30).refine(
      (value) => value === null || /^[+()\d\s.-]{7,30}$/.test(value),
      "Enter a valid phone number.",
    ),
  })
  .strict();

export type AddressInput = z.infer<typeof addressInputSchema>;

/** Reads the address fields from a submitted form. */
export function addressFromFormData(formData: FormData): Record<string, string> {
  const fields = ["fullName", "line1", "line2", "city", "region", "postalCode", "phone"] as const;
  return Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")]));
}
