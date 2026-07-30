import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getOrderDetails } from "@/api/orderApi";
import type { OrderDetails, OrderStatus } from "@/api/types/order";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { notify } from "@/lib/notifications";
import { toAppError } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import PageHeader from "@/components/common/PageHeader";
import AppPagination from "@/components/common/AppPagination";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import AppError from "@/components/common/AppError";
import ApiDebug from "@/components/common/ApiDebug";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Status → tone class. Exhaustive over OrderStatus (noFallthroughCasesInSwitch
 * guards the union); shipment/payment statuses arrive as plain strings and
 * fall back to muted.
 */
function statusToneClass(status: OrderStatus | string): string {
  switch (status as OrderStatus) {
    case "pending":
    case "partially_refunded":
      return "text-warning";
    case "processing":
    case "in_transit":
    case "authorized":
      return "text-info";
    case "completed":
    case "delivered":
    case "captured":
      return "text-success";
    case "shipped":
    case "refunded":
      return "text-primary";
    case "failed":
      return "text-destructive";
    case "voided":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", statusToneClass(status))}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

/**
 * Orders Page — list + details with shipping tracking.
 * API: GET /order/v1/private/orders (list)
 * API: GET /order/v1/private/orders/:id/details (aggregation)
 */
export default function OrdersPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderData, setSelectedOrderData] = useState<OrderDetails | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const PAGE_SIZE = 10;

  const { orders: ordersList, total, totalPages, loading, error } = useOrders({
    page,
    pageSize: PAGE_SIZE,
    enabled: isAuthenticated,
  });

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: String(newPage) });
  };

  // Details panel keeps its own request state on purpose: it is a
  // click-driven master/detail view, not shared server state.
  const handleViewOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setOrderDetailsLoading(true);
    setSelectedOrderData(null);

    try {
      const result = await getOrderDetails(orderId);
      setSelectedOrderData(result);
    } catch (err) {
      notify.error(toAppError(err, "Cannot load orders").message);
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-4">
        <PageHeader title="My Orders" backLink="/" backText="← Back to Home" />
        <EmptyState message="Please log in to view your orders" icon="🔒">
          <Button onClick={() => void navigate("/login?returnTo=/orders")}>
            Login
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <PageHeader
        title="My Orders"
        backLink="/"
        backText="← Back to Home"
        apiLabel={`API: GET /order/v1/private/orders • ${total} orders • Page ${page} of ${totalPages || 1}`}
      />

      {loading && <LoadingState message="Loading orders..." variant="list" count={3} />}

      {!loading && error && (
        <AppError error={error} endpoint="GET /order/v1/private/orders" />
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Orders List */}
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersList.length === 0 ? (
                <EmptyState message="No orders yet" icon="📦">
                  <Button variant="outline" render={<Link to="/products">Start Shopping</Link>} />
                </EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 font-medium">Order</th>
                        <th className="py-2 font-medium">Status</th>
                        <th className="py-2 font-medium">Total</th>
                        <th className="hidden py-2 font-medium sm:table-cell">Date</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersList.map((order) => (
                        <tr key={order.id} className="border-b last:border-b-0">
                          <td className="max-w-32 truncate py-2 font-mono text-xs">
                            #{order.id}
                          </td>
                          <td className="py-2">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="py-2">{formatCurrency(order.total)}</td>
                          <td className="hidden py-2 sm:table-cell">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleViewOrder(order.id)}
                              disabled={orderDetailsLoading && selectedOrderId === order.id}
                            >
                              {orderDetailsLoading && selectedOrderId === order.id
                                ? "..."
                                : "View"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {totalPages > 1 && (
                <AppPagination
                  label="Orders pagination"
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              {orderDetailsLoading && <LoadingState message="Loading order details..." />}

              {!orderDetailsLoading && selectedOrderData ? (
                <OrderDetailsPanel details={selectedOrderData} />
              ) : (
                !orderDetailsLoading && (
                  <p className="text-sm text-muted-foreground">
                    Select an order to view details
                  </p>
                )
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ApiDebug
        data={{ orders: ordersList, selectedOrderData }}
        label="Orders API Response"
      />
    </div>
  );
}

function OrderDetailsPanel({ details }: { details: OrderDetails }) {
  const { order, shipment, payment } = details;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="font-mono text-sm">Order #{order.id}</strong>
        <StatusBadge status={order.status} />
        <span className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleString()}
        </span>
      </div>

      {order.items && order.items.length > 0 && (
        <div className="overflow-x-auto rounded-md border p-3">
          <h4 className="mb-2 text-sm font-semibold">Order Items</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 font-medium">Product</th>
                <th className="py-1 font-medium">Qty</th>
                <th className="hidden py-1 font-medium sm:table-cell">Price</th>
                <th className="py-1 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="py-1">{item.product_name}</td>
                  <td className="py-1">{item.quantity}</td>
                  <td className="hidden py-1 sm:table-cell">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="py-1">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(order.subtotal !== undefined || order.shipping !== undefined) && (
        <div className="rounded-md border p-3">
          <h4 className="mb-2 text-sm font-semibold">Order Summary</h4>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatCurrency(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>{formatCurrency(order.shipping)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd className="text-primary">{formatCurrency(order.total)}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Payment — from the aggregation endpoint (present when payments are enabled) */}
      {payment && (
        <div className="rounded-md border p-3 text-sm">
          <h4 className="mb-1 font-semibold">Payment</h4>
          <p>
            Status: <StatusBadge status={payment.status} />
          </p>
          <p>Amount: {formatCurrency(payment.amount)}</p>
          {payment.refunded !== undefined && payment.refunded > 0 && (
            <p>Refunded: {formatCurrency(payment.refunded)}</p>
          )}
          {payment.decline_code && (
            <p className="text-muted-foreground">
              Decline reason: {payment.decline_code.replace(/_/g, " ")}
            </p>
          )}
        </div>
      )}

      {/* Shipping tracking — from the aggregation endpoint */}
      {shipment ? (
        <div className="rounded-md border p-3 text-sm">
          <h4 className="mb-1 font-semibold">Shipment Tracking</h4>
          <p>Carrier: {shipment.carrier || "N/A"}</p>
          <p>
            Status: <StatusBadge status={shipment.status} />
          </p>
          <p className="break-all">Tracking: {shipment.tracking_number}</p>
          {shipment.estimated_delivery && (
            <p>Est: {new Date(shipment.estimated_delivery).toLocaleDateString()}</p>
          )}
        </div>
      ) : (
        order.status === "shipped" && (
          <p className="text-sm text-muted-foreground">Shipment info not available</p>
        )
      )}
    </div>
  );
}
