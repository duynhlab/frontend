import {
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
    };
}

let store = createStore();

export function getMockStore() {
    return store;
}
