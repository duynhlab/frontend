import { z } from "zod";

/**
 * Address step schema. Optional fields stay plain strings (the API accepts
 * empty values for them); the country code is the 2-letter ISO form.
 */
export const addressSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  line1: z.string().trim().min(1, "Address line 1 is required"),
  line2: z.string(),
  city: z.string().trim().min(1, "City is required"),
  region: z.string(),
  post_code: z.string(),
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Use the 2-letter country code (e.g. VN)"),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
