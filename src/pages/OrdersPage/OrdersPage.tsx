import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { cancelOrder, getOrderDetails } from "@/api/orderApi";
import type { OrderDetails, OrderStatus } from "@/api/types/order";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { notify } from "@/lib/notifications";
import { toAppError } from "@/lib/errors";
import { canCancelOrder } from "@/lib/orderPolicy";
import { formatCurrency } from "@/lib/format";
import PageHeader from "@/components/common/PageHeader";
import AppPagination from "@/components/common/AppPagination";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import ConfirmAction from "@/components/common/ConfirmAction";
import AppError from "@/components/common/AppError";
import ApiDebug from "@/components/common/ApiDebug";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import PageShell from "@/components/layout/PageShell";

/**
 * Status → tone class, covering OrderStatus plus the shipment/payment statuses
 * that arrive as plain strings.
 *
 * The `default` arm means the compiler will NOT flag a newly added OrderStatus
 * here — an unhandled state silently renders muted. Keep this in step with the
 * union by hand; `orders-cancel.spec.ts` asserts the cancel-flow tones.
 */
function statusToneClass(status: OrderStatus | string): string {
  switch (status as OrderStatus) {
    case "pending":
    case "cancelling":
    case "partially_refunded":
      return "text-warning";
    case "processing":
    case "confirmed":
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
    case "manual_review":
      return "text-destructive";
    case "cancelled":
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

  const { orders: ordersList, total, totalPages, loading, error, refresh } = useOrders({
    page,
    pageSize: PAGE_SIZE,
    enabled: isAuthenticated,
  });

  const [cancelling, setCancelling] = useState(false);

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

  /**
   * Cancellation is accepted asynchronously, so the response only tells us the
   * request was taken. Re-read the details and the list afterwards so the
   * cancelling → cancelled progression renders from server truth rather than
   * an optimistic guess.
   *
   * Never rethrows: ConfirmAction keeps its dialog open when onConfirm
   * rejects, which would strand the user on a failure they have already been
   * told about.
   */
  const handleCancelOrder = async (orderId: string) => {
    setCancelling(true);
    try {
      const result = await cancelOrder(orderId);
      notify.success(`Order #${orderId} is ${result.status}`);
      await handleViewOrder(orderId);
      refresh();
    } catch (err) {
      const appErr = toAppError(err, "Cancel failed — please try again");
      // A closed cancellation window is an expected outcome, not a failure:
      // warning tone, per the status-colour policy in AGENTS.md.
      if (
        appErr.code === "ORDER_NOT_CANCELLABLE" ||
        appErr.code === "SHIPMENT_ALREADY_DISPATCHED"
      ) {
        notify.warning(appErr.message);
        // The gate refused, so our view of the order is stale — re-read it.
        await handleViewOrder(orderId);
        refresh();
      } else {
        notify.error(appErr.message);
      }
    } finally {
      setCancelling(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <PageShell>
        <PageHeader title="My Orders" backLink="/" backText="← Back to Home" />
        <EmptyState message="Please log in to view your orders" icon="🔒">
          <Button onClick={() => void navigate("/login?returnTo=/orders")}>
            Login
          </Button>
        </EmptyState>
      </PageShell>
    );
  }

  return (
    <PageShell>
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
        <div
          className={cn(
            "grid gap-4",
            // The detail pane only exists once something is selected, so the
            // list runs full width until then instead of facing an empty half.
            selectedOrderId && "lg:grid-cols-[minmax(0,1fr)_24rem]",
          )}
        >
          {/* Orders List */}
          <Card size="sm">
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
          {selectedOrderId && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              {orderDetailsLoading && <LoadingState message="Loading order details..." />}

              {!orderDetailsLoading && selectedOrderData && (
                <OrderDetailsPanel
                  details={selectedOrderData}
                  onCancel={handleCancelOrder}
                  cancelling={cancelling}
                />
              )}
            </CardContent>
          </Card>
          )}
        </div>
      )}

      <ApiDebug
        data={{ orders: ordersList, selectedOrderData }}
        label="Orders API Response"
      />
    </PageShell>
  );
}

/** `order_placed` / `SHIPMENT_FETCH_FAILED` → readable prose. */
function humanize(token: string): string {
  return token.replace(/_/g, " ").toLowerCase();
}

function OrderDetailsPanel({
  details,
  onCancel,
  cancelling,
}: {
  details: OrderDetails;
  onCancel: (orderId: string) => void | Promise<void>;
  cancelling: boolean;
}) {
  const { order, shipment, payment, processing, degraded } = details;

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="font-mono text-sm">Order #{order.id}</strong>
        <StatusBadge status={order.status} />
        <span className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleString()}
        </span>
        {canCancelOrder(order, shipment) && (
          <ConfirmAction
            trigger={
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="ms-auto"
                disabled={cancelling}
              >
                {cancelling ? "Cancelling…" : "Cancel order"}
              </Button>
            }
            title={`Cancel order #${order.id}?`}
            description="Cancellation is processed asynchronously and cannot be undone once it completes."
            confirmLabel="Cancel order"
            // Not the default "Cancel": next to a "Cancel order" button, two
            // buttons reading "Cancel" would be ambiguous about which one
            // abandons the dialog and which one cancels the order.
            cancelLabel="Keep order"
            destructive
            onConfirm={() => onCancel(order.id)}
          />
        )}
      </div>

      {/* Where the order sits in the fulfilment saga — absent on older orders. */}
      {processing && (
        <p className="text-xs text-muted-foreground">
          Processing: {humanize(processing.stage)}
          {processing.last_error_code && ` (${humanize(processing.last_error_code)})`}
        </p>
      )}

      {/* Enrichment the aggregate could not read — distinct from absent data. */}
      {degraded && degraded.length > 0 && (
        <p className="flex flex-wrap gap-1">
          {degraded.map((token) => (
            <Badge key={token} variant="outline" className="text-warning">
              ⚠ {humanize(token)} unavailable
            </Badge>
          ))}
        </p>
      )}

      {order.items && order.items.length > 0 && (
        <section className="overflow-x-auto">
          <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Order Items</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 font-medium">Product</th>
                <th className="py-2 font-medium">Qty</th>
                <th className="hidden py-2 font-medium sm:table-cell">Price</th>
                <th className="py-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="py-2">{item.product_name}</td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="hidden py-1 sm:table-cell">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="py-2">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {(order.subtotal !== undefined || order.shipping !== undefined) && (
        <section>
          <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Order Summary</h4>
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
        </section>
      )}

      {/* Payment — from the aggregation endpoint (present when payments are enabled) */}
      {payment && (
        <section>
          <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Payment</h4>
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
        </section>
      )}

      {/* Shipping tracking — from the aggregation endpoint */}
      {shipment ? (
        <section>
          <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Shipment Tracking</h4>
          <p>Carrier: {shipment.carrier || "N/A"}</p>
          <p>
            Status: <StatusBadge status={shipment.status} />
          </p>
          <p className="break-all">Tracking: {shipment.tracking_number}</p>
          {shipment.estimated_delivery && (
            <p>Est: {new Date(shipment.estimated_delivery).toLocaleDateString()}</p>
          )}
        </section>
      ) : (
        order.status === "completed" && (
          <p className="text-sm text-muted-foreground">Shipment info not available</p>
        )
      )}
    </div>
  );
}
