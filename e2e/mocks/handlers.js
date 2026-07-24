import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name) {
    return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

const authLogin = loadFixture('auth-login.json');
const productDetail = loadFixture('product-detail.json');

const PRODUCT_NAMES = [
    'Wireless Headphones', 'Smart Watch', 'Laptop Stand', 'USB-C Hub',
    'Mechanical Keyboard', 'Gaming Mouse', 'Monitor Light Bar', 'Webcam HD',
    'Desk Mat', 'Cable Organizer', 'Phone Stand', 'Portable SSD',
    'Bluetooth Speaker', 'Power Bank', 'Screen Protector', 'Laptop Sleeve',
    'Wireless Charger', 'Noise Canceller', 'Smart Plug', 'LED Strip',
    'Tablet Case', 'Stylus Pen', 'USB Microphone', 'Ring Light',
    'Ergonomic Chair', 'Standing Desk', 'Air Purifier', 'Smart Thermostat',
    'Fitness Tracker', 'VR Headset',
];

const TOTAL_E2E_PRODUCTS = 48;
const DEFAULT_PAGE_SIZE = 24;

function generateProduct(index) {
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

function buildProductsPage(pageNum, pageSize = DEFAULT_PAGE_SIZE) {
    const offset = (pageNum - 1) * pageSize;
    const count = Math.min(pageSize, TOTAL_E2E_PRODUCTS - offset);
    const items = Array.from({ length: count }, (_, i) => generateProduct(offset + i));

    return {
        items,
        page: pageNum,
        page_size: pageSize,
        total_items: TOTAL_E2E_PRODUCTS,
        total_pages: Math.ceil(TOTAL_E2E_PRODUCTS / pageSize),
    };
}

/**
 * Intercept gateway-shaped API calls and fulfill with fixture JSON.
 * Matches paths from src/api/* — no live backend required.
 */
export async function installApiMocks(page) {
    await page.route('**/auth/v1/public/auth/login', async (route) => {
        await route.fulfill({ json: authLogin });
    });

    await page.route('**/auth/v1/public/auth/register', async (route) => {
        await route.fulfill({ json: authLogin });
    });

    await page.route('**/auth/v1/public/auth/refresh', async (route) => {
        await route.fulfill({ json: authLogin });
    });

    await page.route('**/auth/v1/public/auth/logout', async (route) => {
        await route.fulfill({ json: { ok: true } });
    });

    await page.route(/\/product\/v1\/public\/products(\?.*)?$/, async (route) => {
        const url = new URL(route.request().url());
        const pageNum = Number(url.searchParams.get('page')) || 1;
        const pageSize = Number(url.searchParams.get('page_size')) || DEFAULT_PAGE_SIZE;
        const json = buildProductsPage(pageNum, pageSize);
        await route.fulfill({ json });
    });

    await page.route(/\/product\/v1\/public\/products\/[^/]+\/details$/, async (route) => {
        await route.fulfill({
            json: {
                product: productDetail,
                stock: { available: true, quantity: 42 },
                reviews: [],
            },
        });
    });

    await page.route(/\/product\/v1\/public\/products\/[^/]+$/, async (route) => {
        await route.fulfill({ json: productDetail });
    });

    await page.route('**/cart/v1/private/cart/count', async (route) => {
        await route.fulfill({ json: { count: 0 } });
    });

    await page.route('**/cart/v1/private/cart', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({
                json: {
                    items: [{
                        id: 'item-1',
                        product_id: 'prod-00001',
                        product_name: 'Wireless Headphones',
                        product_price: 49.99,
                        quantity: 1,
                        subtotal: 49.99,
                    }],
                    item_count: 1,
                    subtotal: 49.99,
                    shipping: 5,
                    total: 54.99,
                },
            });
            return;
        }
        await route.fulfill({
            json: {
                items: [],
                item_count: 0,
                subtotal: 0,
                shipping: 0,
                total: 0,
            },
        });
    });

    await page.route('**/notification/v1/private/notifications/count', async (route) => {
        await route.fulfill({ json: { count: 0 } });
    });
}
