import { Link } from "react-router-dom";
import type { Cart } from "@/api/types/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

/**
 * CartSummary — totals panel + checkout CTA.
 */
export default function CartSummary({ cart }: { cart: Cart }) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatCurrency(cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{formatCurrency(cart.shipping)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatCurrency(cart.total)}</dd>
          </div>
        </dl>
        <Button className="w-full" render={<Link to="/checkout">Proceed to Checkout</Link>} />
      </CardContent>
    </Card>
  );
}
