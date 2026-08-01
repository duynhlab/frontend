import type { Order, Shipment } from "@/api/types/order";

/**
 * Whether an order may still be cancelled (RFC-0021).
 *
 * A mirror of the server policy, used for two different purposes: the UI hides
 * the Cancel action when it returns false, and the mock backend refuses with
 * 409 ORDER_NOT_CANCELLABLE. Sharing one function keeps those two from
 * drifting — a UI gate looser than the mock's would render a button that
 * always fails in mock mode and dogfood.
 *
 * It is NOT authoritative. The real API re-checks, and can refuse an order
 * this returns true for: the shipment may dispatch between the details read
 * and the cancel request.
 */
export function canCancelOrder(
  order: Pick<Order, "status">,
  shipment?: Pick<Shipment, "status"> | undefined,
): boolean {
  if (order.status !== "confirmed" && order.status !== "completed") return false;
  // No shipment record yet means nothing has been handed to the carrier.
  if (!shipment) return true;
  return shipment.status === "pending" || shipment.status === "cancelled";
}
