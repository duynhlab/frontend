/**
 * Seed fixtures for VITE_USE_MOCK=true local development.
 * Demo login: username `alice`, password `password123` (see AGENTS.md).
 */

export const DEMO_USERNAME = 'alice';
export const DEMO_PASSWORD = 'password123';

export const DEMO_USER = {
    id: 'user-alice-001',
    username: DEMO_USERNAME,
    email: 'alice@example.com',
};

export const MOCK_TOKENS = {
    access_token: 'mock-access-token-alice',
    refresh_token: 'mock-refresh-token-alice',
};

export const SEED_PROFILE = {
    id: DEMO_USER.id,
    username: DEMO_USER.username,
    email: DEMO_USER.email,
    name: 'Alice Demo',
    phone: '+84 90 123 4567',
};

export const SEED_NOTIFICATIONS = [
    {
        id: 'notif-001',
        type: 'order',
        title: 'Order shipped',
        message: 'Your order #ord-1001 is on its way.',
        read: false,
        created_at: '2026-07-20T10:00:00Z',
    },
    {
        id: 'notif-002',
        type: 'promo',
        title: 'Weekend sale',
        message: '15% off accessories this weekend.',
        read: false,
        created_at: '2026-07-19T08:30:00Z',
    },
    {
        id: 'notif-003',
        type: 'system',
        title: 'Welcome to DuynhLab',
        message: 'Thanks for joining duynhlab Shop.',
        read: true,
        created_at: '2026-07-01T12:00:00Z',
    },
];

export const SEED_ORDERS = [
    {
        id: 'ord-1001',
        status: 'shipped',
        total: 54.99,
        created_at: '2026-07-18T14:22:00Z',
        item_count: 1,
    },
    {
        id: 'ord-1000',
        status: 'delivered',
        total: 129.99,
        created_at: '2026-07-10T09:15:00Z',
        item_count: 1,
    },
];

export const PRODUCT_NAMES = [
    'Wireless Headphones', 'Smart Watch', 'Laptop Stand', 'USB-C Hub',
    'Mechanical Keyboard', 'Gaming Mouse', 'Monitor Light Bar', 'Webcam HD',
    'Desk Mat', 'Cable Organizer', 'Phone Stand', 'Portable SSD',
    'Bluetooth Speaker', 'Power Bank', 'Screen Protector', 'Laptop Sleeve',
    'Wireless Charger', 'Noise Canceller', 'Smart Plug', 'LED Strip',
    'Tablet Case', 'Stylus Pen', 'USB Microphone', 'Ring Light',
    'Ergonomic Chair', 'Standing Desk', 'Air Purifier', 'Smart Thermostat',
    'Fitness Tracker', 'VR Headset',
];

export const TOTAL_MOCK_PRODUCTS = 48;

export function generateProduct(index) {
    const id = `prod-${String(index + 1).padStart(5, '0')}`;
    const nameIndex = index % PRODUCT_NAMES.length;
    const variant = Math.floor(index / PRODUCT_NAMES.length) + 1;
    const name = variant > 1
        ? `${PRODUCT_NAMES[nameIndex]} v${variant}`
        : PRODUCT_NAMES[nameIndex];
    const price = parseFloat((9.99 + (index * 3.17) % 490).toFixed(2));
    const stockQty = ((index * 7) % 200) + 1;

    return {
        id,
        name,
        price,
        description: `High quality ${name.toLowerCase()} for everyday use.`,
        stock: stockQty,
    };
}

/** First-page products aligned with e2e fixtures for consistency. */
export function seedProductCatalog() {
    return Array.from({ length: TOTAL_MOCK_PRODUCTS }, (_, i) => generateProduct(i));
}
