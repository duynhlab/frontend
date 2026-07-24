import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getOrderDetails } from '../../api/orderApi';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useToast } from '../../hooks/useToast';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import ApiDebug from '../../components/common/ApiDebug';
import { formatCurrency } from '../../utils/formatCurrency';

/**
 * Orders Page - List and view orders with shipping tracking
 * API: GET /order/v1/private/orders - List all orders
 * API: GET /order/v1/private/orders/:id/details - Get order with shipment (aggregation)
 * 
 * Uses aggregation endpoint for strict 3-layer compliance
 */
export default function OrdersPage() {
    const navigate = useNavigate();
    const { notify } = useToast();
    const { isAuthenticated } = useAuth();

    // Selected order state (for details panel)
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [selectedOrderData, setSelectedOrderData] = useState(null);
    const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);

    // Page number from the URL (?page=N), 1-based
    const [searchParams, setSearchParams] = useSearchParams();
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const PAGE_SIZE = 10;

    // Fetch the current page of orders (paginated)
    const { orders: ordersList, total, totalPages, loading, error } = useOrders({
        page,
        pageSize: PAGE_SIZE,
        enabled: isAuthenticated,
    });

    const handlePageChange = (newPage) => {
        setSearchParams({ page: String(newPage) });
    };

    // Handle viewing order details (uses aggregation endpoint)
    const handleViewOrder = async (orderId) => {
        setSelectedOrderId(orderId);
        setOrderDetailsLoading(true);
        setSelectedOrderData(null);

        try {
            const result = await getOrderDetails(orderId);
            setSelectedOrderData(result);
            if (import.meta.env.DEV) {
                console.log('[API] GET /orders/' + orderId + '/details:', result);
            }
        } catch (err) {
            notify('error', 'Failed to load order details');
            if (import.meta.env.DEV) {
                console.error('[API ERROR]', err);
            }
        } finally {
            setOrderDetailsLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'var(--warning)',
            processing: 'var(--info)',
            completed: 'var(--success)',
            shipped: 'var(--accent)',
            delivered: 'var(--success)',
            in_transit: 'var(--info)',
            // payment states (order-details enrichment)
            authorized: 'var(--info)',
            captured: 'var(--success)',
            failed: 'var(--error)',
            voided: 'var(--text-muted)',
            refunded: 'var(--accent)',
            partially_refunded: 'var(--warning)',
        };
        return colors[status] || 'var(--text-muted)';
    };

    // Auth gate
    if (!isAuthenticated) {
        return (
            <div className="page container">
                <PageHeader title="My Orders" backLink="/" backText="← Back to Home" />
                <EmptyState message="Please log in to view your orders" icon="🔒" />
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button className="primary" onClick={() => navigate('/login?returnTo=/orders')}>
                        Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page container">
            <PageHeader 
                title="My Orders" 
                backLink="/" 
                backText="← Back to Home"
                apiLabel={`API: GET /order/v1/private/orders • ${total} orders • Page ${page} of ${totalPages || 1}`}
            />

            {/* Loading */}
            {loading && <LoadingState message="Loading orders..." variant="list" count={3} />}

            {/* Error */}
            {!loading && error && (
                <div className="error">Error: {error}</div>
            )}

            {/* Content */}
            {!loading && !error && (
                <div className="orders-layout">
                    {/* Orders List */}
                    <div className="card orders-history">
                        <h3>Order History</h3>
                        {ordersList.length === 0 ? (
                            <EmptyState message="No orders yet" icon="📦">
                                <Link to="/">Start Shopping</Link>
                            </EmptyState>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Order</th>
                                            <th>Status</th>
                                            <th>Total</th>
                                            <th className="hide-mobile">Date</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ordersList.map(order => (
                                            <tr key={order.id}>
                                                <td>#{order.id}</td>
                                                <td>
                                                    <span className="order-status" style={{ color: getStatusColor(order.status) }}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td>{formatCurrency(order.total)}</td>
                                                <td className="hide-mobile">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <button 
                                                        onClick={() => handleViewOrder(order.id)}
                                                        disabled={orderDetailsLoading && selectedOrderId === order.id}
                                                    >
                                                        {orderDetailsLoading && selectedOrderId === order.id ? '...' : 'View'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        )}
                    </div>

                    {/* Order Details */}
                    <div className="card order-details">
                        <h3>Order Details</h3>
                        {orderDetailsLoading && (
                            <LoadingState message="Loading order details..." />
                        )}
                        
                        {!orderDetailsLoading && selectedOrderData ? (
                            <OrderDetailsPanel 
                                order={selectedOrderData.order} 
                                shipment={selectedOrderData.shipment}
                                payment={selectedOrderData.payment}
                                getStatusColor={getStatusColor}
                            />
                        ) : !orderDetailsLoading && (
                            <p className="text-muted">Select an order to view details</p>
                        )}
                    </div>
                </div>
            )}

            {/* API Debug */}
            <ApiDebug data={{ orders: ordersList, selectedOrderData }} label="Orders API Response" />
        </div>
    );
}

// Separate component for order details panel - layout consistent with Checkout
function OrderDetailsPanel({ order, shipment, payment, getStatusColor }) {
    if (!order) return null;

    return (
        <div className="order-details-panel">
            {/* Header: Order ID + Status + Date */}
            <div className="order-details-header">
                <div>
                    <strong>Order #{order.id}</strong>
                </div>
                <span
                    className="order-status-badge"
                    style={{ color: getStatusColor(order.status) }}
                >
                    {order.status}
                </span>
                <div className="text-muted order-details-date">
                    {new Date(order.created_at).toLocaleString()}
                </div>
            </div>

            {/* Two-col layout: Order Items (left) + Order Summary (right) - same as Checkout */}
            <div className="order-details-layout">
                {/* Order Items - table format */}
                <div className="card order-items-section">
                    <h4>Order Items</h4>
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
                                {order.items?.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.product_name}</td>
                                        <td>{item.quantity}</td>
                                        <td className="hide-mobile">{formatCurrency(item.price)}</td>
                                        <td>{formatCurrency(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Order Summary - Subtotal / Shipping / Total */}
                <div className="card order-summary-section">
                    <h4>Order Summary</h4>
                    <table>
                        <tbody>
                            <tr><th>Subtotal</th><td>{formatCurrency(order.subtotal)}</td></tr>
                            <tr><th>Shipping</th><td>{formatCurrency(order.shipping)}</td></tr>
                            <tr className="order-total-row">
                                <th><strong>Total</strong></th>
                                <td><strong className="order-total-value">{formatCurrency(order.total)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment - from aggregation endpoint (present when payments are enabled) */}
            {payment && (
                <div className="payment-box">
                    <strong>Payment</strong>
                    <p>
                        Status:{' '}
                        <span style={{ color: getStatusColor(payment.status) }}>
                            {payment.status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                    </p>
                    <p>Amount: {formatCurrency(payment.amount)}</p>
                    {payment.refunded > 0 && (
                        <p>Refunded: {formatCurrency(payment.refunded)}</p>
                    )}
                    {payment.decline_code && (
                        <p className="text-muted">Decline reason: {payment.decline_code.replace(/_/g, ' ')}</p>
                    )}
                </div>
            )}

            {/* Shipping Tracking - from aggregation endpoint */}
            {shipment && (
                <div className="shipment-box">
                    <strong>Shipment Tracking</strong>
                    <p>Carrier: {shipment.carrier || 'N/A'}</p>
                    <p>
                        Status:{' '}
                        <span style={{ color: getStatusColor(shipment.status) }}>
                            {shipment.status?.replace('_', ' ').toUpperCase()}
                        </span>
                    </p>
                    <p>Tracking: {shipment.tracking_number}</p>
                    {shipment.estimated_delivery && (
                        <p>Est: {new Date(shipment.estimated_delivery).toLocaleDateString()}</p>
                    )}
                </div>
            )}
            {!shipment && order.status === 'shipped' && (
                <div className="shipment-box">
                    <p className="text-muted">Shipment info not available</p>
                </div>
            )}
        </div>
    );
}
