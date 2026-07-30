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
] satisfies Order[];

export function orderDetailsFor(order: Order): OrderDetails {
  return {
    order: { ...order },
    shipment: {
      status: order.status === "delivered" ? "delivered" : "in_transit",
      carrier: "E2E Express",
      tracking_number: `E2E-${order.id}`,
    },
  } satisfies OrderDetails;
}
