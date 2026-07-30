import type { AppNotification } from "@/api/types/notification";
import type { CartItem } from "@/api/types/cart";
import type { CheckoutSession } from "@/api/types/checkout";
import type { Order } from "@/api/types/order";
import type { Product } from "@/api/types/product";
import type { Review } from "@/api/types/product";
import type { UserProfile } from "@/api/types/user";
import {
  DEMO_PASSWORD,
  DEMO_USER,
  SEED_NOTIFICATIONS,
  SEED_ORDERS,
  SEED_PROFILE,
  seedProductCatalog,
} from "./seed";

/**
 * Sentinel literal: CI greps production assets for this string to prove the
 * mock store was dead-code-eliminated from real builds. Do not rename without
 * updating scripts/ci/migration-guards.sh.
 */
export const MOCK_STORE_SENTINEL = "__APP_MOCK_STORE__";

export interface MockStore {
  /** Runtime reference to the sentinel so the literal survives minification
   * exactly when this module is bundled (the CI dist-grep depends on it). */
  sentinel: string;
  products: Product[];
  cartItems: CartItem[];
  notifications: AppNotification[];
  orders: Order[];
  profile: UserProfile;
  reviews: Review[];
  checkoutSessions: Map<string, CheckoutSession>;
  credentials: { username: string; password: string };
}

let seq = 1000;
export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function createStore(): MockStore {
  seq = 1000;
  return {
    sentinel: MOCK_STORE_SENTINEL,
    products: seedProductCatalog(),
    cartItems: [],
    notifications: SEED_NOTIFICATIONS.map((n) => ({ ...n })),
    orders: SEED_ORDERS.map((o) => ({ ...o })),
    profile: { ...SEED_PROFILE },
    reviews: [],
    checkoutSessions: new Map(),
    credentials: { username: DEMO_USER.username, password: DEMO_PASSWORD },
  };
}

// Lazy init: no module-scope side effect, so production builds (mock off)
// can tree-shake this module entirely — CI verifies via the sentinel grep.
let store: MockStore | null = null;

export function getMockStore(): MockStore {
  store ??= createStore();
  return store;
}

/** Reset in-memory state to seed data (e.g. after logout in mock mode). */
export function resetMockStore(): void {
  store = createStore();
}
