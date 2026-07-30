import type { CartItem } from "@/api/types/cart";
import { Button } from "@/components/ui/button";
import ConfirmAction from "@/components/common/ConfirmAction";
import QuantitySelector from "@/features/products/QuantitySelector";
import { formatCurrency } from "@/lib/format";

interface CartItemRowProps {
  item: CartItem;
  busy: boolean;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void | Promise<void>;
}

/**
 * CartItemRow — one line item with the shared quantity stepper and a
 * confirmed remove (destructive actions never fire immediately, AGENTS.md).
 */
export default function CartItemRow({
  item,
  busy,
  onQuantityChange,
  onRemove,
}: CartItemRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{item.product_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(item.product_price)} each
        </p>
      </div>
      <div className="flex items-center gap-3">
        <QuantitySelector
          quantity={item.quantity}
          min={1}
          onChange={(quantity) => {
            if (!busy && quantity !== item.quantity) {
              onQuantityChange(item.id, quantity);
            }
          }}
        />
        <span className="w-20 text-right text-sm font-semibold">
          {formatCurrency(item.subtotal)}
        </span>
        <ConfirmAction
          trigger={
            <Button type="button" variant="destructive" size="sm" disabled={busy}>
              Remove
            </Button>
          }
          title={`Remove ${item.product_name}?`}
          description="This item will be removed from your cart."
          confirmLabel="Remove"
          destructive
          onConfirm={() => onRemove(item.id)}
        />
      </div>
    </div>
  );
}
