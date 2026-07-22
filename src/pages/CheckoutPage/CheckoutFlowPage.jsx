import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import {
    createSession, setAddress, setShipping, setPayment, applyPromo, removePromo,
    confirmSession, cancelSession, idempotencyKeyFor, clearIdempotencyKey,
} from '../../api/checkoutApi';
import { useToast } from '../../hooks/useToast';
import { toUserFriendlyError } from '../../utils/errorMessages';
import { formatCurrency } from '../../utils/formatCurrency';
import { parseApiError } from '../../utils/parseApiError';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import ApiDebug from '../../components/common/ApiDebug';
import Stepper from './Stepper';
import { SHIPPING_METHODS, PAYMENT_METHODS } from './constants';
import AddressStep from './AddressStep';
import ShippingStep from './ShippingStep';
import PaymentStep from './PaymentStep';
import ReviewStep from './ReviewStep';
import OrderSummary from './OrderSummary';
import './checkout.css';

// Session status → funnel step (the server FSM is the source of truth; the
// UI just renders whatever state comes back).
const STEP_OF_STATUS = {
    open: 1, address_set: 2, shipping_set: 3, ready: 4, completed: 5,
};
const STEP_LABELS = ['Address', 'Shipping', 'Payment', 'Review'];

/**
 * Checkout Flow — the RFC-0015 session funnel (single entry since the legacy
 * one-shot checkout was removed): POST/PUT
 * /checkout/v1/private/checkout/sessions[…].
 */
export default function CheckoutFlowPage() {
    const navigate = useNavigate();
    const { notify } = useToast();
    const { mutate: globalMutate, cache } = useSWRConfig();

    const [session, setSession] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [address, setAddressForm] = useState({
        full_name: '', line1: '', line2: '', city: '', region: '', post_code: '', country: 'VN',
    });
    const [shippingMethod, setShippingMethod] = useState(SHIPPING_METHODS[0].key);
    const [paymentToken, setPaymentToken] = useState(PAYMENT_METHODS[0].token);
    // null = follow the server FSM; a number = the user navigated back via the
    // stepper (the server legally re-enters earlier states on re-submit).
    const [stepOverride, setStepOverride] = useState(null);
    const [promoError, setPromoError] = useState(null);
    const headingRef = useRef(null);

    const isAuthenticated = !!localStorage.getItem('authToken');

    const bootSession = useCallback(async () => {
        setLoadError(null);
        setStepOverride(null);
        try {
            const s = await createSession();
            setSession(s);
            if (s.address) setAddressForm((prev) => ({ ...prev, ...s.address }));
            if (s.shipping_method) setShippingMethod(s.shipping_method);
        } catch (err) {
            const { code, message } = parseApiError(err);
            if (code === 'CONFLICT') setLoadError('empty-cart');
            else setLoadError(toUserFriendlyError(message, code));
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login?returnTo=/checkout');
            return;
        }
        bootSession();
    }, [isAuthenticated, navigate, bootSession]);

    const serverStep = session ? (STEP_OF_STATUS[session.status] ?? 1) : 1;
    const step = stepOverride ?? serverStep;

    // Move focus to the step heading when the visible step changes (a11y).
    useEffect(() => {
        headingRef.current?.focus?.();
    }, [step]);

    // Shared error handling for every funnel mutation: expired sessions are
    // recreated; a requote (409 with a `session` body) re-renders the fresh
    // quote — the Idempotency-Key is NOT consumed and stays reusable.
    const handleFunnelError = (err) => {
        const { code, message, session: requoted, status, isRateLimit } = parseApiError(err);
        if (isRateLimit) {
            notify('info', err.message);
            return;
        }
        if (status === 410) {
            notify('error', toUserFriendlyError(null, 'SESSION_EXPIRED'));
            bootSession();
            return;
        }
        if (requoted) {
            setSession(requoted);
            notify('error', toUserFriendlyError(message, code));
            return;
        }
        notify('error', toUserFriendlyError(message, code));
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

    const submitAddress = async () => {
        const s = await run(() => setAddress(session.id, address))();
        if (s) setStepOverride(null);
    };
    const submitShipping = async () => {
        const s = await run(() => setShipping(session.id, shippingMethod))();
        if (s) setStepOverride(null);
    };
    const submitPayment = async () => {
        const s = await run(() => setPayment(session.id, paymentToken))();
        if (s) setStepOverride(null);
    };

    const submitApplyPromo = async (code) => {
        setPromoError(null);
        setBusy(true);
        try {
            const s = await applyPromo(session.id, code);
            setSession(s);
            notify('success', 'Promo applied — totals updated.');
            return true;
        } catch (err) {
            const { code: errCode, message, session: requoted } = parseApiError(err);
            if (requoted) setSession(requoted);
            setPromoError(toUserFriendlyError(message, errCode));
            return false;
        } finally {
            setBusy(false);
        }
    };
    const submitRemovePromo = async () => {
        setPromoError(null);
        await run(() => removePromo(session.id))();
    };

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

    // Rebuild the quote from the current cart: the session pins items at
    // creation, so a cart edited afterwards diverges silently.
    const handleRebuildQuote = async () => {
        setBusy(true);
        try {
            await cancelSession(session.id);
            clearIdempotencyKey(session.id);
        } catch { /* stale/expired session — safe to continue */ }
        setBusy(false);
        await bootSession();
    };

    const priceChanged = session?.items?.some((it) => it.price_changed);
    // Session ≠ cart detection: compare against the cart-count SWR cache the
    // navbar keeps fresh (no extra request from this page).
    const cartCount = cache.get('cart-count')?.data?.count;
    const sessionCount = session?.items?.reduce((n, it) => n + it.quantity, 0);
    const cartDiverged = session && session.status !== 'completed'
        && Number.isFinite(cartCount) && Number.isFinite(sessionCount)
        && cartCount !== sessionCount;

    return (
        <div className="page container checkout-page">
            <div className="checkout-header">
                <h2 ref={headingRef} tabIndex={-1}>Checkout</h2>
            </div>

            {loadError === 'empty-cart' && (
                <EmptyState icon="🛒" message="Your cart is empty — add items before checking out." />
            )}
            {loadError && loadError !== 'empty-cart' && (
                <div className="error-box" role="alert">
                    <strong>Error:</strong> {loadError}
                    <div className="step-actions">
                        <button type="button" className="primary" onClick={bootSession}>
                            Try again
                        </button>
                    </div>
                </div>
            )}
            {!session && !loadError && <LoadingState variant="card" count={2} />}

            {/* Success */}
            {session?.status === 'completed' && (
                <div className="card checkout-success">
                    <div className="success-icon" aria-hidden="true">✅</div>
                    <h3>Order placed!</h3>
                    <p className="order-meta">
                        Order #{session.order_id} · {formatCurrency(session.total)}
                    </p>
                    <div className="step-actions">
                        <button className="primary" onClick={() => navigate('/orders')}>
                            View orders
                        </button>
                        <button onClick={() => navigate('/')}>Continue shopping</button>
                    </div>
                    <ApiDebug data={session} />
                </div>
            )}

            {session && session.status !== 'completed' && (
                <>
                    <Stepper
                        labels={STEP_LABELS}
                        current={step}
                        disabled={busy}
                        onStepClick={setStepOverride}
                    />

                    {priceChanged && (
                        <div className="checkout-alert warning" role="alert">
                            <span aria-hidden="true">⚠️</span>
                            <div className="alert-body">
                                <p>
                                    Some prices or availability changed since you carted these
                                    items — the quote below uses the current catalog. Items
                                    marked <em>price updated</em> were adjusted.
                                </p>
                            </div>
                        </div>
                    )}

                    {cartDiverged && (
                        <div className="checkout-alert info" role="status">
                            <span aria-hidden="true">ℹ️</span>
                            <div className="alert-body">
                                <p>
                                    Your cart changed after this quote was created — the summary
                                    reflects the older snapshot.
                                </p>
                            </div>
                            <button type="button" onClick={handleRebuildQuote} disabled={busy}>
                                Rebuild quote
                            </button>
                        </div>
                    )}

                    <div className="checkout-grid">
                        <div className="card">
                            {step === 1 && (
                                <AddressStep
                                    address={address}
                                    onChange={setAddressForm}
                                    onSubmit={submitAddress}
                                    busy={busy}
                                />
                            )}
                            {step === 2 && (
                                <ShippingStep
                                    method={shippingMethod}
                                    onChange={setShippingMethod}
                                    onSubmit={submitShipping}
                                    onEditAddress={() => setStepOverride(1)}
                                    busy={busy}
                                />
                            )}
                            {step === 3 && (
                                <PaymentStep
                                    token={paymentToken}
                                    onChange={setPaymentToken}
                                    onSubmit={submitPayment}
                                    busy={busy}
                                />
                            )}
                            {step === 4 && (
                                <ReviewStep session={session} onConfirm={submitConfirm} busy={busy} />
                            )}
                        </div>

                        <OrderSummary
                            session={session}
                            busy={busy}
                            promoError={promoError}
                            onApplyPromo={submitApplyPromo}
                            onRemovePromo={submitRemovePromo}
                            onCancel={handleCancel}
                        />
                    </div>
                    <ApiDebug data={session} />
                </>
            )}
        </div>
    );
}
