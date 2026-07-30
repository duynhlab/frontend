import apiClient from "./client";
import * as mock from "./mock";
import { parseCheckoutSession } from "./schemas/checkout.schema";
import type {
  CheckoutAddress,
  CheckoutSession,
  ShippingMethod,
} from "./types/checkout";

/**
 * Checkout API — RFC-0015 session funnel (all private, JWT required).
 * Edge paths: /checkout/v1/private/checkout/sessions[…] (naming v3.0.1 —
 * checkout is process-named, resources nest under the literal segment).
 *
 * Every session response passes through the Zod boundary schema: checkout is
 * the money path, so a malformed payload must fail loudly, not render "—".
 */

/**
 * POST /checkout/v1/private/checkout/sessions
 */
export async function createSession(): Promise<CheckoutSession> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockCreateSession();
  const response = await apiClient.post(
    "/checkout/v1/private/checkout/sessions",
  );
  return parseCheckoutSession(response.data);
}

/**
 * GET /checkout/v1/private/checkout/sessions/:id
 */
export async function getSession(id: string): Promise<CheckoutSession> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetSession(id);
  const response = await apiClient.get(
    `/checkout/v1/private/checkout/sessions/${id}`,
  );
  return parseCheckoutSession(response.data);
}

/**
 * PUT /checkout/v1/private/checkout/sessions/:id/address
 */
export async function setAddress(
  id: string,
  address: CheckoutAddress,
): Promise<CheckoutSession> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockSetAddress(id, address);
  const response = await apiClient.put(
    `/checkout/v1/private/checkout/sessions/${id}/address`,
    address,
  );
  return parseCheckoutSession(response.data);
}

/**
 * PUT /checkout/v1/private/checkout/sessions/:id/shipping
 */
export async function setShipping(
  id: string,
  shippingMethod: ShippingMethod,
): Promise<CheckoutSession> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockSetShipping(id, shippingMethod);
  const response = await apiClient.put(
    `/checkout/v1/private/checkout/sessions/${id}/shipping`,
    { shipping_method: shippingMethod },
  );
  return parseCheckoutSession(response.data);
}

/**
 * PUT /checkout/v1/private/checkout/sessions/:id/payment
 */
export async function setPayment(
  id: string,
  paymentMethodToken: string,
): Promise<CheckoutSession> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockSetPayment(id, paymentMethodToken);
  const response = await apiClient.put(
    `/checkout/v1/private/checkout/sessions/${id}/payment`,
    { payment_method_token: paymentMethodToken },
  );
  return parseCheckoutSession(response.data);
}

/**
 * POST /checkout/v1/private/checkout/sessions/:id/confirm
 */
export async function confirmSession(
  id: string,
  idempotencyKey: string,
): Promise<CheckoutSession> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockConfirmSession(id);
  const response = await apiClient.post(
    `/checkout/v1/private/checkout/sessions/${id}/confirm`,
    null,
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
  return parseCheckoutSession(response.data);
}

/**
 * POST /checkout/v1/private/checkout/sessions/:id/promo
 */
export async function applyPromo(
  id: string,
  code: string,
): Promise<CheckoutSession> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockApplyPromo(id, code);
  const response = await apiClient.post(
    `/checkout/v1/private/checkout/sessions/${id}/promo`,
    { code },
  );
  return parseCheckoutSession(response.data);
}

/**
 * DELETE /checkout/v1/private/checkout/sessions/:id/promo
 */
export async function removePromo(id: string): Promise<CheckoutSession> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockRemovePromo(id);
  const response = await apiClient.delete(
    `/checkout/v1/private/checkout/sessions/${id}/promo`,
  );
  return parseCheckoutSession(response.data);
}

/**
 * DELETE /checkout/v1/private/checkout/sessions/:id
 */
export async function cancelSession(id: string): Promise<{ ok: boolean }> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockCancelSession(id);
  const response = await apiClient.delete<{ ok: boolean }>(
    `/checkout/v1/private/checkout/sessions/${id}`,
  );
  return response.data;
}

/**
 * Idempotency-Key persistence: one key per session, minted once and kept in
 * localStorage so a reload / second tab / retry converges on the same order
 * instead of minting a new attempt.
 */
export function idempotencyKeyFor(sessionId: string): string {
  const storageKey = `checkoutIdemKey:${sessionId}`;
  let key = localStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(storageKey, key);
  }
  return key;
}

/** Drop the stored key once its session reached a terminal outcome. */
export function clearIdempotencyKey(sessionId: string): void {
  localStorage.removeItem(`checkoutIdemKey:${sessionId}`);
}
