/**
 * Seed fixtures for VITE_USE_MOCK=true local development.
 * Demo login: username `alice`, password `password123` (see AGENTS.md).
 */
import type { StoredUser } from "@/api/types/auth";
import type { AppNotification } from "@/api/types/notification";
import type { Order } from "@/api/types/order";
import type { Product } from "@/api/types/product";
import type { UserProfile } from "@/api/types/user";
import {
  TOTAL_SEED_PRODUCTS,
  productIdFor,
  productNameFor,
  productPriceFor,
  productStockFor,
} from "./seed-constants";

export { TOTAL_SEED_PRODUCTS as TOTAL_MOCK_PRODUCTS };

export const DEMO_USERNAME = "alice";
export const DEMO_PASSWORD = "password123";

export const DEMO_USER = {
  id: "user-alice-001",
  username: DEMO_USERNAME,
  email: "alice@example.com",
} satisfies StoredUser;

export const MOCK_TOKENS = {
  access_token: "mock-access-token-alice",
  refresh_token: "mock-refresh-token-alice",
};

export const SEED_PROFILE = {
  id: DEMO_USER.id,
  username: DEMO_USER.username,
  email: DEMO_USER.email,
  name: "Alice Demo",
  phone: "+84 90 123 4567",
} satisfies UserProfile;

export const SEED_NOTIFICATIONS = [
  {
    id: "notif-001",
    type: "order",
    title: "Order shipped",
    message: "Your order #ord-1001 is on its way.",
    read: false,
    created_at: "2026-07-20T10:00:00Z",
  },
  {
    id: "notif-002",
    type: "promo",
    title: "Weekend sale",
    message: "15% off accessories this weekend.",
    read: false,
    created_at: "2026-07-19T08:30:00Z",
  },
  {
    id: "notif-003",
    type: "system",
    title: "Welcome to DuynhLab",
    message: "Thanks for joining duynhlab Shop.",
    read: true,
    created_at: "2026-07-01T12:00:00Z",
  },
] satisfies AppNotification[];

export const SEED_ORDERS = [
  // Cancellable: `confirmed` with no dispatched shipment. Without one of
  // these the Cancel action is unreachable in mock mode and dogfood.
  {
    id: "ord-1002",
    status: "confirmed",
    total: 42.5,
    created_at: "2026-07-28T08:05:00Z",
    item_count: 1,
  },
  {
    id: "ord-1001",
    status: "shipped",
    total: 54.99,
    created_at: "2026-07-18T14:22:00Z",
    item_count: 1,
  },
  {
    id: "ord-1000",
    status: "delivered",
    total: 129.99,
    created_at: "2026-07-10T09:15:00Z",
    item_count: 1,
  },
] satisfies Order[];

export function generateProduct(index: number): Product {
  const name = productNameFor(index);
  return {
    id: productIdFor(index),
    name,
    price: productPriceFor(index),
    description: `High quality ${name.toLowerCase()} for everyday use.`,
    stock: productStockFor(index),
  } satisfies Product;
}

/** First-page products aligned with e2e fixtures for consistency. */
export function seedProductCatalog(): Product[] {
  return Array.from({ length: TOTAL_SEED_PRODUCTS }, (_, i) =>
    generateProduct(i),
  );
}
