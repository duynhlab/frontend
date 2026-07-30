import { z } from "zod";
import type { CheckoutSession } from "@/api/types/checkout";

/**
 * Runtime validation for the checkout boundary only (high-risk: money and
 * order creation). Other services trust their DTO types — do not Zod-parse
 * every response (AGENTS.md).
 */
const checkoutAddressSchema = z.object({
  full_name: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  region: z.string().optional(),
  post_code: z.string().optional(),
  country: z.string(),
});

const checkoutItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  unit_price: z.number(),
  quantity: z.number(),
  subtotal: z.number(),
  price_changed: z.boolean().optional(),
});

export const checkoutSessionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "address_set", "shipping_set", "ready", "completed"]),
  items: z.array(checkoutItemSchema),
  subtotal: z.number(),
  shipping_fee: z.number(),
  tax: z.number(),
  discount: z.number().default(0),
  total: z.number(),
  address: checkoutAddressSchema.nullable(),
  shipping_method: z.enum(["standard", "express"]).nullable(),
  promo_code: z.string().nullable(),
  order_id: z.string().optional(),
}) satisfies z.ZodType<CheckoutSession, unknown>;

export function parseCheckoutSession(data: unknown): CheckoutSession {
  return checkoutSessionSchema.parse(data);
}
