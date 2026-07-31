import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSWRConfig } from "swr";
import { getCart, removeCartItem, updateCartItem } from "@/api/cartApi";
import { useApiQuery } from "@/hooks/useApiQuery";
import { notify } from "@/lib/notifications";
import { toAppError } from "@/lib/errors";
import { isAuthenticated as hasStoredToken } from "@/auth/tokens";
import ApiDebug from "@/components/common/ApiDebug";
import AppError from "@/components/common/AppError";
import EmptyState from "@/components/common/EmptyState";
import LoadingState from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CartItemRow from "@/features/cart/CartItemRow";
import CartSummary from "@/features/cart/CartSummary";
import PageShell from "@/components/layout/PageShell";

/**
 * Cart Page — full cart operations
 * GET /cart/v1/private/cart
 * PATCH /cart/v1/private/cart/items/:itemId
 * DELETE /cart/v1/private/cart/items/:itemId
 */
export default function CartPage() {
  const navigate = useNavigate();
  const { mutate: globalMutate } = useSWRConfig();
  const [actionItemId, setActionItemId] = useState<string | null>(null);

  const isAuthenticated = hasStoredToken();

  // Server state via SWR (shares the 'cart' key with Checkout)
  const { data: cart, loading, error, mutate } = useApiQuery(
    isAuthenticated ? "cart" : null,
    getCart,
  );

  const items = cart?.items || [];

  // Run a cart write, then revalidate the cart and sync the header badge
  const runCartAction = async (
    itemId: string,
    action: () => Promise<unknown>,
    {
      successMessage,
      errorMessage = "Cannot update cart",
    }: { successMessage?: string; errorMessage?: string } = {},
  ) => {
    setActionItemId(itemId);
    try {
      await action();
      const updated = await mutate();
      const count = (updated?.items || []).reduce(
        (sum, i) => sum + (i.quantity || 0),
        0,
      );
      void globalMutate("cart-count", { count }, { revalidate: true });
      if (successMessage) {
        notify.success(successMessage);
      }
    } catch (err) {
      notify.error(toAppError(err, errorMessage).message);
    } finally {
      setActionItemId(null);
    }
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    void runCartAction(itemId, () => updateCartItem(itemId, newQuantity), {
      errorMessage: "Cannot update quantity",
    });
  };

  const handleRemoveItem = (itemId: string) =>
    runCartAction(itemId, () => removeCartItem(itemId), {
      successMessage: "Removed from cart",
    });

  // Gated state for unauthenticated users
  if (!isAuthenticated) {
    return (
      <PageShell>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Shopping Cart</h2>
        <EmptyState icon="🔐" message="You need to log in to view your cart.">
          <Button onClick={() => void navigate("/login")}>Login</Button>
          <Button variant="outline" onClick={() => void navigate("/products")}>
            Continue Shopping
          </Button>
        </EmptyState>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h2 className="mb-1 text-xl font-semibold tracking-tight">Shopping Cart</h2>
      <p className="mb-4 font-mono text-xs text-muted-foreground">
        API: GET /cart/v1/private/cart
      </p>

      {loading && <LoadingState message="Loading cart..." />}

      {!loading && error && (
        <AppError error={error} endpoint="GET /cart/v1/private/cart" />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState size="sm" className="mx-auto max-w-md" message="Your cart is empty">
          <Button variant="outline" render={<Link to="/products">Browse Products</Link>} />
        </EmptyState>
      )}

      {!loading && !error && cart && items.length > 0 && (
        /* A fixed summary track, not 1fr: at 2fr_1fr the summary was over
           400px wide for three money rows, starving the item columns. */
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Items ({cart.item_count})</CardTitle>
            </CardHeader>
            <CardContent>
              {/* -my-3 cancels the first and last row's own py-3. */}
              <ul className="-my-3">
                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    busy={actionItemId === item.id}
                    onQuantityChange={handleUpdateQuantity}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>

          <CartSummary cart={cart} />
        </div>
      )}

      <ApiDebug data={cart} />
    </PageShell>
  );
}
