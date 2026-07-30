import type { ApiHandler } from "../server";
import { authHandlers } from "./auth.handlers";
import { productHandlers } from "./products.handlers";
import { cartHandlers } from "./cart.handlers";
import { checkoutHandlers } from "./checkout.handlers";
import {
  notificationHandlers,
  orderHandlers,
  reviewHandlers,
  userHandlers,
} from "./account.handlers";

/**
 * All method+path-scoped handlers. The dispatcher (server.ts) picks the FIRST
 * match, so more specific paths (…/count, …/details, …/read-all) must appear
 * before their generic siblings within each group.
 */
export const handlers: ApiHandler[] = [
  ...authHandlers,
  ...productHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...orderHandlers,
  ...notificationHandlers,
  ...userHandlers,
  ...reviewHandlers,
];
