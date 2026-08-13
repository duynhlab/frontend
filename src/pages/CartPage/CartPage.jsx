import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { getCart, updateCartItem, removeCartItem } from '../../api/cartApi';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatCurrency';
import ApiDebug from '../../components/common/ApiDebug';

/**
 * Cart Page - Full cart operations
 * GET /cart/v1/private/cart
 * PATCH /cart/v1/private/cart/items/:itemId
 * DELETE /cart/v1/private/cart/items/:itemId
 */
export default function CartPage() {
    const navigate = useNavigate();
    const { notify } = useToast();
    const { mutate: globalMutate } = useSWRConfig();
    const [actionLoading, setActionLoading] = useState(null);

    // Check authentication (Keycloak-backed)
    const { isAuthenticated } = useAuth();

    // Server state via SWR (shares the 'cart' key with Checkout)
    const { data: cart, loading, error, mutate } = useApiQuery(
        isAuthenticated ? 'cart' : null,
        getCart
    );

    const items = cart?.items || [];

    // Run a cart write, then revalidate the cart and sync the header badge
    const runCartAction = async (itemId, action, { successMessage, errorMessage = 'Cannot update cart' } = {}) => {
        setActionLoading(itemId);
        try {
            await action();
            const updated = await mutate();
            const count = (updated?.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
            globalMutate('cart-count', { count }, { revalidate: true });
            if (successMessage) {
                notify('success', successMessage);
            }
        } catch (err) {
            notify('error', err.message || errorMessage);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdateQuantity = (itemId, newQuantity) => {
        if (newQuantity < 1) return;
        runCartAction(itemId, () => updateCartItem(itemId, newQuantity), {
            errorMessage: 'Cannot update quantity',
        });
    };

    const handleRemoveItem = (itemId) => {
        runCartAction(itemId, () => removeCartItem(itemId), {
            successMessage: 'Removed from cart',
        });
    };

    // Gated state for unauthenticated users
    if (!isAuthenticated) {
        return (
            <div className="page container">
                <h2>Shopping Cart</h2>
                <div className="empty" style={{ marginTop: '1rem' }}>
                    <p>You need to log in to view your cart.</p>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button className="primary" onClick={() => navigate('/login')}>
                            Login
                        </button>
                        <button onClick={() => navigate('/products')}>
                            Continue Shopping
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page container">
            <h2>Shopping Cart</h2>
            <p className="api-label">API: GET /cart/v1/private/cart</p>

            {/* Loading */}
            {loading && <div className="loading">Loading cart...</div>}

            {/* Error */}
            {!loading && error && <div className="error">Error: {error}</div>}

            {/* Empty */}
            {!loading && !error && items.length === 0 && (
                <div className="empty">
                    <p>Your cart is empty</p>
                    <Link to="/products">Browse Products</Link>
                </div>
            )}

            {/* Cart Content */}
            {!loading && !error && items.length > 0 && (
                <div className="two-col">
                    {/* Cart Items */}
                    <div className="card">
                        <h3>Items ({cart.item_count})</h3>
                        {items.map(item => (
                            <div key={item.id} className="cart-item">
                                <div>
                                    <strong>{item.product_name}</strong>
                                    <p className="text-muted">{formatCurrency(item.product_price)} each</p>
                                </div>
                                <div className="cart-item-actions">
                                    <button
                                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                        disabled={actionLoading === item.id || item.quantity <= 1}
                                    >−</button>
                                    <span>{item.quantity}</span>
                                    <button
                                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                        disabled={actionLoading === item.id}
                                    >+</button>
                                    <span className="cart-item-subtotal">{formatCurrency(item.subtotal)}</span>
                                    <button
                                        className="danger"
                                        onClick={() => handleRemoveItem(item.id)}
                                        disabled={actionLoading === item.id}
                                    >Remove</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Cart Summary */}
                    <div className="card">
                        <h3>Order Summary</h3>
                        <table>
                            <tbody>
                                <tr><th>Subtotal</th><td>{formatCurrency(cart.subtotal)}</td></tr>
                                <tr><th>Shipping</th><td>{formatCurrency(cart.shipping)}</td></tr>
                                <tr><th><strong>Total</strong></th><td><strong>{formatCurrency(cart.total)}</strong></td></tr>
                            </tbody>
                        </table>
                        <Link to="/checkout">
                            <button className="primary" style={{ width: '100%', marginTop: '0.75rem' }}>
                                Proceed to Checkout
                            </button>
                        </Link>
                    </div>
                </div>
            )}

            {/* API Debug (dev only) */}
            <ApiDebug data={cart} />
        </div>
    );
}
