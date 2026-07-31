import type { CartItem } from "@/api/types/cart";
import { Button } from "@/components/ui/button";
import ConfirmAction from "@/components/common/ConfirmAction";
import PlaceholderImage from "@/components/common/PlaceholderImage";
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
    /*
      A grid with a shared column template, not flex: with `justify-between`
      each row positioned its own controls according to its own text width, so
      nothing lined up down the list. `sm:contents` promotes the action wrapper
      into the row's tracks on wider screens, so one piece of markup serves both
      the mobile action bar and the aligned desktop columns.
    */
    <li className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b py-3 last:border-b-0 sm:grid-cols-[5rem_minmax(0,1fr)_auto_6rem_auto]">
      <div className="aspect-[4/3] w-20 overflow-hidden rounded-md bg-secondary">
        <PlaceholderImage size="small" label={item.product_name} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.product_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(item.product_price)} each
        </p>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-3 sm:contents">
        <QuantitySelector
          quantity={item.quantity}
          min={1}
          labelPosition="sr-only"
          onChange={(quantity) => {
            if (!busy && quantity !== item.quantity) {
              onQuantityChange(item.id, quantity);
            }
          }}
        />
        <span className="text-sm font-semibold sm:text-right">
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
    </li>
  );
}
