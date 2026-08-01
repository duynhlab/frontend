import { mockDelay } from './delay';
import { mockError } from './errors';
import {
    DEMO_USER,
    MOCK_TOKENS,
    TOTAL_MOCK_PRODUCTS,
} from './seed';
import { getMockStore, nextId, resetMockStore } from './store';

export { resetMockStore };

// ── Auth ────────────────────────────────────────────────────────────────────

export async function mockLogin(username, password) {
    await mockDelay();
    const { credentials } = getMockStore();
    if (username === credentials.username && password === credentials.password) {
        return {
            ...MOCK_TOKENS,
            user: { ...DEMO_USER },
        };
    }
    throw mockError('Invalid email or password', 401);
}

export async function mockRegister(username, _email, _password) {
    await mockDelay();
    return {
        ...MOCK_TOKENS,
        user: { id: nextId('user'), username, email: `${username}@example.com` },
    };
}

export async function mockLogout() {
    await mockDelay(100);
    resetMockStore();
    return { ok: true };
}

// ── Products ────────────────────────────────────────────────────────────────

export async function mockGetProducts(params = {}) {
    await mockDelay();
    const page = Number(params.page) || 1;
    const limit = Number(params.page_size ?? params.limit) || 24;
    const offset = (page - 1) * limit;
    const { products } = getMockStore();
    const items = products.slice(offset, offset + limit);
    const totalPages = Math.ceil(TOTAL_MOCK_PRODUCTS / limit) || 1;

    return {
        items,
        page,
        page_size: limit,
        total_items: TOTAL_MOCK_PRODUCTS,
        total_pages: totalPages,
    };
}

export async function mockGetProduct(id) {
    await mockDelay();
    const product = getMockStore().products.find((p) => p.id === id);
    if (!product) throw mockError('Resource not found', 404);
    return product;
}

export async function mockGetProductDetails(id) {
    await mockDelay();
    const product = getMockStore().products.find((p) => p.id === id);
    if (!product) throw mockError('Resource not found', 404);
    const reviews = getMockStore().reviews.filter((r) => r.product_id === id);
    return {
        product,
        stock: { available: product.stock > 0, quantity: product.stock },
        reviews,
    };
}

// ── Cart helpers ────────────────────────────────────────────────────────────

function buildCartEnvelope(items) {
    const normalized = items.map((item) => ({
        ...item,
        subtotal: item.product_price * item.quantity,
    }));
    const subtotal = normalized.reduce((sum, i) => sum + i.subtotal, 0);
    const shipping = normalized.length > 0 ? 5 : 0;
    return {
        items: normalized,
        item_count: normalized.reduce((sum, i) => sum + i.quantity, 0),
        subtotal,
        shipping,
        total: subtotal + shipping,
    };
}

function syncCart(envelope) {
    getMockStore().cartItems = envelope.items.map((i) => ({ ...i }));
    return envelope;
}

export async function mockGetCart() {
    await mockDelay();
    return buildCartEnvelope(getMockStore().cartItems);
}

export async function mockGetCartCount() {
    await mockDelay(100);
    const count = getMockStore().cartItems.reduce((sum, i) => sum + i.quantity, 0);
    return { count };
}

export async function mockAddToCart(productId, productName, productPrice, quantity = 1) {
    await mockDelay();
    const store = getMockStore();
    const existing = store.cartItems.find((i) => i.product_id === productId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        store.cartItems.push({
            id: nextId('item'),
            product_id: productId,
            product_name: productName,
            product_price: productPrice,
            quantity,
        });
    }
    return syncCart(buildCartEnvelope(store.cartItems));
}

export async function mockUpdateCartItem(itemId, quantity) {
    await mockDelay();
    const store = getMockStore();
    const item = store.cartItems.find((i) => i.id === itemId);
    if (!item) throw mockError('Resource not found', 404);
    item.quantity = quantity;
    return syncCart(buildCartEnvelope(store.cartItems));
}

export async function mockRemoveCartItem(itemId) {
    await mockDelay();
    const store = getMockStore();
    store.cartItems = store.cartItems.filter((i) => i.id !== itemId);
    return syncCart(buildCartEnvelope(store.cartItems));
}

export async function mockClearCart() {
    await mockDelay();
    getMockStore().cartItems = [];
    return syncCart(buildCartEnvelope([]));
}

// ── User profile ────────────────────────────────────────────────────────────

export async function mockGetUserProfile() {
    await mockDelay();
    return { ...getMockStore().profile };
}

export async function mockGetUser(id) {
    await mockDelay();
    if (id === DEMO_USER.id) return { ...DEMO_USER };
    throw mockError('Profile not found', 404);
}

export async function mockUpdateProfile(data) {
    await mockDelay();
    Object.assign(getMockStore().profile, data);
    return { ...getMockStore().profile };
}

// ── Notifications ───────────────────────────────────────────────────────────

export async function mockGetNotifications() {
    await mockDelay();
    return getMockStore().notifications.map((n) => ({ ...n }));
}

export async function mockGetNotification(id) {
    await mockDelay();
    const n = getMockStore().notifications.find((x) => x.id === id);
    if (!n) throw mockError('Resource not found', 404);
    return { ...n };
}

export async function mockMarkAsRead(id) {
    await mockDelay();
    const n = getMockStore().notifications.find((x) => x.id === id);
    if (!n) throw mockError('Cannot update notification', 404);
    n.read = true;
    return { ...n };
}

export async function mockMarkAllAsRead() {
    await mockDelay();
    const store = getMockStore();
    let updated = 0;
    store.notifications.forEach((n) => {
        if (!n.read) {
            n.read = true;
            updated += 1;
        }
    });
    return { updated };
}

export async function mockGetNotificationCount() {
    await mockDelay(100);
    const count = getMockStore().notifications.filter((n) => !n.read).length;
    return { count };
}

// ── Orders ──────────────────────────────────────────────────────────────────

export async function mockGetOrders(params = {}) {
    await mockDelay();
    const page = Number(params.page) || 1;
    const pageSize = Number(params.page_size) || 10;
    const { orders } = getMockStore();
    const offset = (page - 1) * pageSize;
    const items = orders.slice(offset, offset + pageSize);
    const total = orders.length;
    return {
        items,
        page,
        page_size: pageSize,
        total_items: total,
        total_pages: Math.ceil(total / pageSize) || 1,
    };
}

export async function mockGetOrder(id) {
    await mockDelay();
    const order = getMockStore().orders.find((o) => o.id === id);
    if (!order) throw mockError('Order not found', 404);
    return { ...order };
}

export async function mockGetOrderDetails(id) {
    await mockDelay();
    const order = getMockStore().orders.find((o) => o.id === id);
    if (!order) throw mockError('Order not found', 404);
    return {
        order: { ...order },
        shipment: {
            status: order.status === 'delivered' ? 'delivered' : 'in_transit',
            carrier: 'Mock Express',
            tracking_number: `MOCK-${id}`,
        },
    };
}

export async function mockCancelOrder(id) {
    await mockDelay();
    const order = getMockStore().orders.find((o) => o.id === id);
    if (!order) throw mockError('Order not found', 404);
    order.status = 'cancelling';
    return { order_id: id, status: 'cancelling' };
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function mockGetReviews(productId) {
    await mockDelay();
    return getMockStore().reviews.filter((r) => r.product_id === productId);
}

export async function mockCreateReview(productId, userId, rating, title, comment) {
    await mockDelay();
    const store = getMockStore();
    const duplicate = store.reviews.some(
        (r) => r.product_id === productId && String(r.user_id) === String(userId)
    );
    if (duplicate) throw mockError('Review already exists', 409);

    const review = {
        id: nextId('review'),
        product_id: productId,
        user_id: userId,
        username: DEMO_USER.username,
        rating,
        title,
        comment,
        created_at: new Date().toISOString(),
    };
    store.reviews.push(review);
    return review;
}

// ── Checkout sessions ───────────────────────────────────────────────────────

const SHIPPING_FEES = { standard: 5, express: 12 };

function sessionFromCart(cartEnvelope) {
    return {
        id: nextId('sess'),
        status: 'open',
        items: cartEnvelope.items.map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            unit_price: i.product_price,
            quantity: i.quantity,
            subtotal: i.subtotal,
        })),
        subtotal: cartEnvelope.subtotal,
        shipping: 0,
        tax: 0,
        total: cartEnvelope.subtotal,
        address: null,
        shipping_method: null,
        promo_code: null,
    };
}

function recalcSession(session) {
    const shipping = session.shipping_method
        ? (SHIPPING_FEES[session.shipping_method] ?? 5)
        : 0;
    session.shipping = shipping;
    session.tax = Math.round(session.subtotal * 0.08 * 100) / 100;
    session.total = session.subtotal + session.shipping + session.tax - (session.discount || 0);
    return session;
}

export async function mockCreateSession() {
    await mockDelay();
    const cart = buildCartEnvelope(getMockStore().cartItems);
    if (cart.items.length === 0) {
        throw mockError('Your cart is empty', 409, 'CONFLICT');
    }
    const session = recalcSession(sessionFromCart(cart));
    getMockStore().checkoutSessions.set(session.id, session);
    return session;
}

export async function mockGetSession(id) {
    await mockDelay();
    const session = getMockStore().checkoutSessions.get(id);
    if (!session) throw mockError('Resource not found', 404);
    return { ...session };
}

export async function mockSetAddress(id, address) {
    await mockDelay();
    const session = getMockStore().checkoutSessions.get(id);
    if (!session) throw mockError('Resource not found', 404);
    session.address = { ...address };
    session.status = 'address_set';
    return { ...recalcSession(session) };
}

export async function mockSetShipping(id, shippingMethod) {
    await mockDelay();
    const session = getMockStore().checkoutSessions.get(id);
    if (!session) throw mockError('Resource not found', 404);
    session.shipping_method = shippingMethod;
    session.status = 'shipping_set';
    return { ...recalcSession(session) };
}

export async function mockSetPayment(id, _paymentMethodToken) {
    await mockDelay();
    const session = getMockStore().checkoutSessions.get(id);
    if (!session) throw mockError('Resource not found', 404);
    session.status = 'ready';
    return { ...recalcSession(session) };
}

export async function mockApplyPromo(id, code) {
    await mockDelay();
    const session = getMockStore().checkoutSessions.get(id);
    if (!session) throw mockError('Resource not found', 404);
    if (code.toLowerCase() !== 'save10') {
        throw mockError('Promo code not found', 400, 'PROMO_INVALID');
    }
    session.promo_code = code;
    session.discount = Math.round(session.subtotal * 0.1 * 100) / 100;
    return { ...recalcSession(session) };
}

export async function mockRemovePromo(id) {
    await mockDelay();
    const session = getMockStore().checkoutSessions.get(id);
    if (!session) throw mockError('Resource not found', 404);
    session.promo_code = null;
    session.discount = 0;
    return { ...recalcSession(session) };
}

export async function mockConfirmSession(id) {
    await mockDelay(400);
    const store = getMockStore();
    const session = store.checkoutSessions.get(id);
    if (!session) throw mockError('Resource not found', 404);
    if (session.status !== 'ready') {
        throw mockError('This step is not available for the current checkout state', 400, 'INVALID_TRANSITION');
    }

    const orderId = nextId('ord');
    store.orders.unshift({
        id: orderId,
        status: 'processing',
        total: session.total,
        created_at: new Date().toISOString(),
        item_count: session.items.reduce((s, i) => s + i.quantity, 0),
    });
    store.cartItems = [];
    store.notifications.unshift({
        id: nextId('notif'),
        type: 'order',
        title: 'Order placed',
        message: `Order #${orderId} was placed successfully.`,
        read: false,
        created_at: new Date().toISOString(),
    });

    session.status = 'completed';
    session.order_id = orderId;
    return { ...session };
}

export async function mockCancelSession(id) {
    await mockDelay();
    getMockStore().checkoutSessions.delete(id);
    return { ok: true };
}
