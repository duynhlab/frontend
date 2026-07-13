import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import {
    createSession, setAddress, setShipping, setPayment, applyPromo, removePromo,
    confirmSession, cancelSession, idempotencyKeyFor, clearIdempotencyKey,
} from '../../api/checkoutApi';
import { useToast } from '../../components/common/ToastProvider';
import { toUserFriendlyError } from '../../utils/errorMessages';
import { formatCurrency } from '../../utils/formatCurrency';
import ApiDebug from '../../components/common/ApiDebug';

// Test payment tokens — opaque references, never card data (the mock
// provider approves/declines by amount, not token).
const PAYMENT_METHODS = [
    { token: 'tok_visa', label: 'Visa test card' },
    { token: 'tok_mastercard', label: 'Mastercard test card' },
];

const SHIPPING_METHODS = [
    { key: 'standard', label: 'Standard' },
    { key: 'express', label: 'Express' },
];

// Session status → funnel step (the server FSM is the source of truth; the
// UI just renders whatever state comes back).
const STEP_OF_STATUS = {
    open: 1, address_set: 2, shipping_set: 3, ready: 4, completed: 5,
};
const STEP_LABELS = ['Address', 'Shipping', 'Payment', 'Review'];

/**
 * Checkout Flow — the RFC-0015 session funnel (P3 SPA cutover).
 * POST/PUT /checkout/v1/private/checkout/sessions[…]; the legacy direct
 * order POST stays at /checkout/legacy (dual-entry until P6).
 */
export default function CheckoutFlowPage() {
    const navigate = useNavigate();
    const { notify } = useToast();
    const { mutate: globalMutate } = useSWRConfig();

    const [session, setSession] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [address, setAddressForm] = useState({
        full_name: '', line1: '', line2: '', city: '', region: '', post_code: '', country: 'VN',
    });
    const [shippingMethod, setShippingMethod] = useState(SHIPPING_METHODS[0].key);
    const [editingAddress, setEditingAddress] = useState(false);
    const [paymentToken, setPaymentToken] = useState(PAYMENT_METHODS[0].token);
    const [promoCode, setPromoCode] = useState('');

    const isAuthenticated = !!localStorage.getItem('authToken');

    const bootSession = useCallback(async () => {
        setLoadError(null);
        try {
            const s = await createSession();
            setSession(s);
            if (s.address) {
                setAddressForm((prev) => ({ ...prev, ...s.address }));
            }
            if (s.shipping_method) setShippingMethod(s.shipping_method);
        } catch (err) {
            const code = err?.response?.data?.code;
            if (code === 'CONFLICT') {
                setLoadError('empty-cart');
            } else {
                setLoadError(toUserFriendlyError(err?.response?.data?.error || err?.message));
            }
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login?returnTo=/checkout');
            return;
        }
        bootSession();
    }, [isAuthenticated, navigate, bootSession]);

    // Shared error handling for every funnel mutation: expired sessions are
    // recreated; a requote (409 with a `session` body) re-renders the fresh
    // quote — the Idempotency-Key is NOT consumed and stays reusable.
    const handleFunnelError = (err) => {
        const data = err?.response?.data;
        if (err?.response?.status === 410) {
            notify('error', 'Session expired — starting a fresh one.');
            bootSession();
            return;
        }
        if (data?.session) {
            setSession(data.session);
            notify('error', data?.error?.message || 'Prices changed — review the updated quote and confirm again.');
            return;
        }
        notify('error', toUserFriendlyError(data?.error || data?.message || err?.message));
    };

    const run = (fn) => async (...args) => {
        setBusy(true);
        try {
            const s = await fn(...args);
            setSession(s);
            return s;
        } catch (err) {
            handleFunnelError(err);
            return null;
        } finally {
            setBusy(false);
        }
    };

    const submitPromo = async (e) => {
        e.preventDefault();
        if (!promoCode.trim()) return;
        const s = await run(() => applyPromo(session.id, promoCode.trim().toUpperCase()))();
        if (s) notify('success', 'Promo applied — totals updated.');
    };
    const submitRemovePromo = async () => {
        const s = await run(() => removePromo(session.id))();
        if (s) setPromoCode('');
    };

    const submitAddress = async () => {
        const s = await run(() => setAddress(session.id, address))();
        if (s) setEditingAddress(false);
    };
    const submitShipping = run(() => setShipping(session.id, shippingMethod));
    const submitPayment = run(() => setPayment(session.id, paymentToken));

    const submitConfirm = async () => {
        setBusy(true);
        try {
            // One key per session, persisted: reload/double-click/retry all
            // converge on the same order.
            const key = idempotencyKeyFor(session.id);
            const s = await confirmSession(session.id, key);
            setSession(s);
            clearIdempotencyKey(session.id);
            notify('success', 'Order placed!');
            // The fulfillment saga clears the cart server-side; reconcile the badge.
            globalMutate('cart-count');
            globalMutate('cart');
        } catch (err) {
            handleFunnelError(err);
        } finally {
            setBusy(false);
        }
    };

    const handleCancel = async () => {
        try {
            await cancelSession(session.id);
            clearIdempotencyKey(session.id);
            notify('success', 'Checkout cancelled.');
            navigate('/cart');
        } catch (err) {
            handleFunnelError(err);
        }
    };

    const serverStep = session ? (STEP_OF_STATUS[session.status] ?? 1) : 1;
    const step = editingAddress ? 1 : serverStep;
    const priceChanged = session?.items?.some((it) => it.price_changed);

    return (
        <div className="page container">
            <Link to="/cart" className="back-link">← Back to Cart</Link>
            <h2>Checkout</h2>
            <p className="api-label">API: /checkout/v1/private/checkout/sessions</p>

            {loadError === 'empty-cart' && (
                <div className="empty">
                    <p>Cart is empty. Add items first.</p>
                    <Link to="/">Browse Products</Link>
                </div>
            )}
            {loadError && loadError !== 'empty-cart' && (
                <div className="error-box">
                    <strong>Error:</strong> {loadError}
                    <button type="button" className="primary" style={{ marginTop: '0.75rem' }} onClick={bootSession}>
                        Try Again
                    </button>
                </div>
            )}
            {!session && !loadError && <div className="loading">Loading...</div>}

            {/* Success */}
            {session?.status === 'completed' && (
                <>
                    <div className="success">
                        <h3>✅ Order Placed!</h3>
                        <p>Order ID: {session.order_id}</p>
                        <p>Total: {formatCurrency(session.total)}</p>
                    </div>
                    <button onClick={() => navigate('/orders')} style={{ marginTop: '0.75rem' }}>
                        View Orders
                    </button>
                    <ApiDebug data={session} />
                </>
            )}

            {session && session.status !== 'completed' && (
                <>
                    {/* Step indicator */}
                    <ol className="checkout-steps" aria-label="Checkout progress">
                        {STEP_LABELS.map((label, i) => (
                            <li key={label} className={step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}>
                                {label}
                            </li>
                        ))}
                    </ol>

                    {priceChanged && (
                        <div className="error-box" role="alert">
                            Some prices changed since you carted them — the totals below are
                            the current catalog prices.
                        </div>
                    )}

                    <div className="two-col">
                        {/* Left: the active step */}
                        <div className="card">
                            {step === 1 && (
                                <form onSubmit={(e) => { e.preventDefault(); submitAddress(); }}>
                                    <h3>Shipping address</h3>
                                    {[
                                        ['full_name', 'Full name', true],
                                        ['line1', 'Address line 1', true],
                                        ['line2', 'Address line 2', false],
                                        ['city', 'City', true],
                                        ['region', 'Region/State', false],
                                        ['post_code', 'Postal code', false],
                                        ['country', 'Country code', true],
                                    ].map(([field, label, required]) => (
                                        <label key={field} className="form-field">
                                            <span>{label}{required ? ' *' : ''}</span>
                                            <input
                                                value={address[field]}
                                                required={required}
                                                onChange={(e) => setAddressForm({ ...address, [field]: e.target.value })}
                                            />
                                        </label>
                                    ))}
                                    <button className="primary" type="submit" disabled={busy}>
                                        {busy ? 'Saving…' : 'Continue to shipping'}
                                    </button>
                                </form>
                            )}

                            {step === 2 && (
                                <form onSubmit={(e) => { e.preventDefault(); submitShipping(); }}>
                                    <h3>Shipping method</h3>
                                    {SHIPPING_METHODS.map((m) => (
                                        <label key={m.key} className="payment-method-option">
                                            <input
                                                type="radio"
                                                name="shipping-method"
                                                value={m.key}
                                                checked={shippingMethod === m.key}
                                                onChange={() => setShippingMethod(m.key)}
                                            />
                                            <span>{m.label}</span>
                                        </label>
                                    ))}
                                    <p className="text-muted">
                                        The fee is quoted by shipping-service for your destination;
                                        tax applies on subtotal + fee.
                                    </p>
                                    <button className="primary" type="submit" disabled={busy}>
                                        {busy ? 'Quoting…' : 'Continue to payment'}
                                    </button>
                                    <button type="button" onClick={() => setEditingAddress(true)} disabled={busy}>
                                        Edit address
                                    </button>
                                </form>
                            )}

                            {step === 3 && (
                                <form onSubmit={(e) => { e.preventDefault(); submitPayment(); }}>
                                    <h3>Payment method</h3>
                                    {PAYMENT_METHODS.map((m) => (
                                        <label key={m.token} className="payment-method-option">
                                            <input
                                                type="radio"
                                                name="payment-method"
                                                value={m.token}
                                                checked={paymentToken === m.token}
                                                onChange={() => setPaymentToken(m.token)}
                                            />
                                            <span>{m.label}</span>
                                            <code className="text-muted">{m.token}</code>
                                        </label>
                                    ))}
                                    <p className="text-muted payment-method-hint">
                                        Test tokens only — never real card data.
                                    </p>
                                    <button className="primary" type="submit" disabled={busy}>
                                        {busy ? 'Saving…' : 'Review order'}
                                    </button>
                                </form>
                            )}

                            {step === 4 && (
                                <div>
                                    <h3>Review &amp; confirm</h3>
                                    <p>
                                        Ship to: <strong>{session.address?.full_name}</strong>,{' '}
                                        {session.address?.line1}, {session.address?.city},{' '}
                                        {session.address?.country} — {session.shipping_method}
                                    </p>
                                    <button className="primary" style={{ width: '100%' }} onClick={submitConfirm} disabled={busy}>
                                        {busy ? 'Placing order…' : `Place order — ${formatCurrency(session.total)}`}
                                    </button>
                                    <p className="text-muted payment-method-hint">
                                        Double-clicks and retries are safe: this button is idempotent.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Right: live totals */}
                        <div className="card">
                            <h3>Order summary</h3>
                            <div className="table-wrapper">
                                <table>
                                    <tbody>
                                        {session.items?.map((it) => (
                                            <tr key={it.product_id} className={it.price_changed ? 'price-changed' : ''}>
                                                <td>{it.product_name} × {it.quantity}{it.price_changed ? ' ⚠' : ''}</td>
                                                <td>{formatCurrency(it.unit_price * it.quantity)}</td>
                                            </tr>
                                        ))}
                                        <tr><th>Subtotal</th><td>{formatCurrency(session.subtotal)}</td></tr>
                                        {session.discount > 0 && (
                                            <tr><th>Discount ({session.promo_code})</th><td>−{formatCurrency(session.discount)}</td></tr>
                                        )}
                                        <tr><th>Shipping</th><td>{formatCurrency(session.shipping_fee)}</td></tr>
                                        <tr><th>Tax</th><td>{formatCurrency(session.tax)}</td></tr>
                                        <tr><th><strong>Total</strong></th><td><strong>{formatCurrency(session.total)}</strong></td></tr>
                                    </tbody>
                                </table>
                            </div>
                            {/* Promo: a validated preview — the use is only counted at confirm */}
                            {session.promo_code ? (
                                <p className="text-muted">
                                    Code <strong>{session.promo_code}</strong> applied{' '}
                                    <button type="button" onClick={submitRemovePromo} disabled={busy}>Remove</button>
                                </p>
                            ) : (
                                <form onSubmit={submitPromo} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <input
                                        placeholder="Promo code"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        aria-label="Promo code"
                                    />
                                    <button type="submit" disabled={busy || !promoCode.trim()}>Apply</button>
                                </form>
                            )}
                            <button type="button" onClick={handleCancel} disabled={busy} style={{ marginTop: '0.75rem' }}>
                                Cancel checkout
                            </button>
                            <p className="text-muted payment-method-hint">
                                Legacy one-shot checkout is still available{' '}
                                <Link to="/checkout/legacy">here</Link>.
                            </p>
                        </div>
                    </div>
                    <ApiDebug data={session} />
                </>
            )}
        </div>
    );
}
