import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { getCart, clearCart } from '../../api/cartApi';
import { createOrder } from '../../api/orderApi';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useToast } from '../../components/common/ToastProvider';
import { toUserFriendlyError } from '../../utils/errorMessages';
import { formatCurrency } from '../../utils/formatCurrency';
import ApiDebug from '../../components/common/ApiDebug';

// Test payment tokens (Stripe-style opaque references). Which card "brand" is
// cosmetic in the mock — approval/decline is driven by the amount.
const PAYMENT_METHODS = [
    { token: 'tok_visa', label: 'Visa test card' },
    { token: 'tok_mastercard', label: 'Mastercard test card' },
];

/**
 * Checkout Page - Create order
 * POST /order/v1/private/orders
 * user_id extracted from auth token by backend
 */
export default function CheckoutPage() {
    const navigate = useNavigate();
    const { notify } = useToast();
    const { mutate: globalMutate } = useSWRConfig();
    const [submitting, setSubmitting] = useState(false);
    const [orderResult, setOrderResult] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].token);

    const isAuthenticated = !!localStorage.getItem('authToken');

    // Server state via SWR (shares the 'cart' key with CartPage)
    const { data: cart, loading, error, mutate } = useApiQuery(
        isAuthenticated ? 'cart' : null,
        getCart
    );

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login?returnTo=/checkout');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const orderData = {
                items: cart.items.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.product_price
                })),
                payment_method: paymentMethod
            };

            const result = await createOrder(orderData);
            setOrderResult(result);
            notify('success', 'Order created successfully!');

            // Clear cart immediately for UI + backend consistency
            try {
                await clearCart();
                // Zero the header badge instantly (cart is now empty), then
                // reconcile; also refresh the shared cart cache.
                globalMutate('cart-count', { count: 0 }, { revalidate: true });
                globalMutate('cart');
            } catch (clearErr) {
                const message = toUserFriendlyError(clearErr?.message);
                notify('error', `Order created, but failed to clear cart: ${message}`);
            }
        } catch (err) {
            notify('error', toUserFriendlyError(err?.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page container">
            <Link to="/cart" className="back-link">← Back to Cart</Link>
            <h2>Checkout</h2>
            <p className="api-label">API: POST /order/v1/private/orders</p>

            {/* Loading */}
            {loading && <div className="loading">Loading...</div>}

            {/* Order Success */}
            {orderResult && (
                <>
                    <div className="success">
                        <h3>✅ Order Created Successfully!</h3>
                        <p>Order ID: {orderResult.id}</p>
                        <p>Status: {orderResult.status}</p>
                        <p>Total: {formatCurrency(orderResult.total)}</p>
                    </div>
                    <button onClick={() => navigate('/orders')} style={{ marginTop: '0.75rem' }}>
                        View Orders
                    </button>
                    <ApiDebug data={orderResult} />
                </>
            )}

            {/* Empty Cart - only when load succeeded but cart is empty */}
            {!loading && !orderResult && !error && (!cart || !cart.items || cart.items.length === 0) && (
                <div className="empty">
                    <p>Cart is empty. Add items first.</p>
                    <Link to="/">Browse Products</Link>
                </div>
            )}

            {/* Cart Load Error - Retry */}
            {!loading && !orderResult && error && (!cart?.items?.length) && (
                <div className="error-box">
                    <strong>Error:</strong> {toUserFriendlyError(error)}
                    <button
                        type="button"
                        className="primary"
                        style={{ marginTop: '0.75rem' }}
                        onClick={() => mutate()}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Checkout Form */}
            {!loading && !orderResult && cart?.items?.length > 0 && (
                <>
                    <div className="two-col">
                        {/* Order Items */}
                        <div className="card">
                            <h3>Order Items</h3>
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Qty</th>
                                            <th className="hide-mobile">Price</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cart.items.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.product_name}</td>
                                                <td>{item.quantity}</td>
                                                <td className="hide-mobile">{formatCurrency(item.product_price)}</td>
                                                <td>{formatCurrency(item.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="card">
                            <h3>Order Summary</h3>
                            <table>
                                <tbody>
                                    <tr><th>Subtotal</th><td>{formatCurrency(cart.subtotal)}</td></tr>
                                    <tr><th>Shipping</th><td>{formatCurrency(cart.shipping)}</td></tr>
                                    <tr><th><strong>Total</strong></th><td><strong>{formatCurrency(cart.total)}</strong></td></tr>
                                </tbody>
                            </table>

                            {/* Mock payment method — a test-token picker. The token is an
                                opaque reference (never card data); the payment outcome is
                                decided by mockpay's amount triggers, not the token. */}
                            <fieldset className="payment-method">
                                <legend>Payment method</legend>
                                {PAYMENT_METHODS.map(method => (
                                    <label key={method.token} className="payment-method-option">
                                        <input
                                            type="radio"
                                            name="payment-method"
                                            value={method.token}
                                            checked={paymentMethod === method.token}
                                            onChange={() => setPaymentMethod(method.token)}
                                        />
                                        <span>{method.label}</span>
                                        <code className="text-muted">{method.token}</code>
                                    </label>
                                ))}
                                <p className="text-muted payment-method-hint">
                                    Test tokens only — the mock provider approves or declines by
                                    the order amount, not the token.
                                </p>
                            </fieldset>

                            <button
                                className="primary"
                                style={{ width: '100%', marginTop: '0.75rem' }}
                                onClick={handleSubmitOrder}
                                disabled={submitting}
                            >
                                {submitting ? 'Creating Order...' : 'Place Order'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
