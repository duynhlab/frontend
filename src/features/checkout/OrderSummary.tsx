import { useState } from "react";
import type { CheckoutSession } from "@/api/types/checkout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import ConfirmAction from "@/components/common/ConfirmAction";
import { formatCurrency } from "@/lib/format";

interface OrderSummaryProps {
  session: CheckoutSession;
  busy: boolean;
  promoError: string | null;
  onApplyPromo: (code: string) => Promise<boolean>;
  onRemovePromo: () => void;
  onCancel: () => void | Promise<void>;
}

/**
 * Live quote panel: per-item rows (with price-changed badges), the totals
 * ladder, and the promo box. Promo failures render inline here — next to the
 * control that caused them — instead of a transient toast.
 */
export default function OrderSummary({
  session,
  busy,
  promoError,
  onApplyPromo,
  onRemovePromo,
  onCancel,
}: OrderSummaryProps) {
  const [promoCode, setPromoCode] = useState("");

  const submitPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code) {
      void onApplyPromo(code).then((ok) => {
        if (ok) setPromoCode("");
      });
    }
  };

  return (
    /* lg:self-start: a stretched grid item cannot stick. */
    <Card size="sm" className="lg:sticky lg:top-(--sticky-top) lg:self-start">
      <CardHeader>
        <CardTitle>Order summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm">
          {session.items.map((it) => (
            <li key={it.product_id} className="flex justify-between gap-2">
              <span>
                {it.product_name}{" "}
                <span className="text-muted-foreground">× {it.quantity}</span>
                {it.price_changed && (
                  <Badge variant="outline" className="ml-1.5 text-warning">
                    price updated
                  </Badge>
                )}
              </span>
              <span>{formatCurrency(it.unit_price * it.quantity)}</span>
            </li>
          ))}
        </ul>

        <Separator />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(session.subtotal)}</span>
          </div>
          {session.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount ({session.promo_code})</span>
              <span>−{formatCurrency(session.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatCurrency(session.shipping_fee)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatCurrency(session.tax)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(session.total)}</span>
          </div>
        </div>

        {/* Promo: a validated preview — the use is only counted at confirm */}
        <div className="space-y-2">
          {session.promo_code ? (
            <div className="flex items-center justify-between text-sm">
              <span>
                Code <strong>{session.promo_code}</strong> applied
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemovePromo}
                disabled={busy}
              >
                Remove
              </Button>
            </div>
          ) : (
            <form onSubmit={submitPromo} className="flex gap-2">
              <Input
                placeholder="Promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                aria-label="Promo code"
              />
              <Button
                type="submit"
                variant="outline"
                disabled={busy || !promoCode.trim()}
              >
                Apply
              </Button>
            </form>
          )}
          {promoError && (
            <p className="text-sm text-destructive" role="alert">
              {promoError}
            </p>
          )}
        </div>

        <ConfirmAction
          trigger={
            <Button type="button" variant="outline" className="w-full" disabled={busy}>
              Cancel checkout
            </Button>
          }
          title="Cancel this checkout?"
          description="Your quote and any applied promo will be discarded. Items stay in your cart."
          confirmLabel="Cancel checkout"
          cancelLabel="Keep checking out"
          destructive
          onConfirm={onCancel}
        />
      </CardContent>
    </Card>
  );
}
