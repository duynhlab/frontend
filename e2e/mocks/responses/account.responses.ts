import type { AppNotification } from "@/api/types/notification";
import type { Order, OrderDetails } from "@/api/types/order";

export const seedNotifications: AppNotification[] = [
  {
    id: "notif-001",
    type: "order_shipped",
    title: "Order shipped",
    message: "Your order #ord-1001 is on its way.",
    read: false,
    created_at: "2026-07-20T10:00:00Z",
  },
  {
    id: "notif-002",
    type: "promotion",
    title: "Weekend sale",
    message: "15% off accessories this weekend.",
    read: false,
    created_at: "2026-07-19T08:30:00Z",
  },
  {
    id: "notif-003",
    type: "email",
    title: "Welcome to DuynhLab",
    message: "Thanks for joining duynhlab Shop.",
    read: true,
    created_at: "2026-07-01T12:00:00Z",
  },
] satisfies AppNotification[];

export const seedOrders: Order[] = [
  {
    id: "ord-1001",
    status: "shipped",
    total: 54.99,
    created_at: "2026-07-18T14:22:00Z",
    item_count: 1,
  },
  {
    id: "ord-1000",
    status: "delivered",
    total: 129.99,
    created_at: "2026-07-10T09:15:00Z",
    item_count: 1,
  },
  // Cancellable: `confirmed`, and the shipment derived below is still
  // `pending`. Appended last so the existing `#ord-1001` assertions keep
  // their row position.
  {
    id: "ord-1002",
    status: "confirmed",
    total: 42.5,
    created_at: "2026-07-28T08:05:00Z",
    item_count: 1,
  },
] satisfies Order[];

/**
 * Shipment status implied by the order status. A `confirmed` order has not
 * been handed to a carrier, which is what leaves it cancellable.
 */
function shipmentStatusFor(order: Order): string {
  if (order.status === "delivered") return "delivered";
  if (order.status === "confirmed") return "pending";
  if (order.status === "cancelled") return "cancelled";
  return "in_transit";
}

/**
 * The server's cancellability gate, re-stated here on purpose.
 *
 * The e2e layer may not import from `src` beyond DTO types (AGENTS.md), and
 * this is the fake *backend* — it should enforce the policy independently
 * rather than share the app's copy, so a bug in the app's gate cannot mask
 * itself by also relaxing the server that is supposed to catch it.
 */
export function e2eCanCancel(order: Order): boolean {
  if (order.status !== "confirmed" && order.status !== "completed") return false;
  const shipment = shipmentStatusFor(order);
  return shipment === "pending" || shipment === "cancelled";
}

export function orderDetailsFor(order: Order): OrderDetails {
  return {
    order: { ...order },
    shipment: {
      status: shipmentStatusFor(order),
      carrier: "E2E Express",
      tracking_number: `E2E-${order.id}`,
    },
  } satisfies OrderDetails;
}
