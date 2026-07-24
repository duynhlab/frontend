import {
    DEMO_PASSWORD,
    DEMO_USER,
    SEED_NOTIFICATIONS,
    SEED_ORDERS,
    SEED_PROFILE,
    seedProductCatalog,
} from './seed';

let seq = 1000;
export function nextId(prefix) {
    seq += 1;
    return `${prefix}-${seq}`;
}

function createStore() {
    seq = 1000;
    return {
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

let store = createStore();

export function getMockStore() {
    return store;
}

/** Reset in-memory state to seed data (e.g. after logout in mock mode). */
export function resetMockStore() {
    store = createStore();
}
