import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name) {
    return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

const authLogin = loadFixture('auth-login.json');
const productsPage1 = loadFixture('products.json');
const productDetail = loadFixture('product-detail.json');

const productsPage2 = {
    ...productsPage1,
    page: 2,
    items: [
        {
            id: 'prod-00031',
            name: 'USB-C Hub',
            price: 34.99,
            description: 'High quality usb-c hub for everyday use.',
            stock: 25,
        },
    ],
};

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
        const json = pageNum === 2 ? productsPage2 : productsPage1;
        await route.fulfill({ json });
    });

    await page.route(/\/product\/v1\/public\/products\/[^/]+\/details$/, async (route) => {
        await route.fulfill({
            json: {
                product: productDetail,
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

    await page.route('**/notification/v1/private/notifications/count', async (route) => {
        await route.fulfill({ json: { count: 0 } });
    });
}
