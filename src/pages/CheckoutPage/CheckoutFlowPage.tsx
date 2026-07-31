import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSWRConfig } from "swr";
import {
  applyPromo,
  cancelSession,
  clearIdempotencyKey,
  confirmSession,
  createSession,
  idempotencyKeyFor,
  removePromo,
  setAddress,
  setPayment,
  setShipping,
} from "@/api/checkoutApi";
import type { CheckoutSession, ShippingMethod } from "@/api/types/checkout";
import type { CartCount } from "@/api/types/cart";
import { notify } from "@/lib/notifications";
import { toAppError, toUserFriendlyError } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { isAuthenticated as hasStoredToken } from "@/auth/tokens";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import AppError from "@/components/common/AppError";
import ApiDebug from "@/components/common/ApiDebug";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Stepper from "@/features/checkout/Stepper";
import AddressStep from "@/features/checkout/AddressStep";
import ShippingStep from "@/features/checkout/ShippingStep";
import PaymentStep from "@/features/checkout/PaymentStep";
import ReviewStep from "@/features/checkout/ReviewStep";
import OrderSummary from "@/features/checkout/OrderSummary";
import { PAYMENT_METHODS, SHIPPING_METHODS } from "@/features/checkout/constants";
import type { AddressFormValues } from "@/features/checkout/schemas";
import PageShell from "@/components/layout/PageShell";

// Session status → funnel step (the server FSM is the source of truth; the
// UI just renders whatever state comes back).
const STEP_OF_STATUS: Record<CheckoutSession["status"], number> = {
  open: 1,
  address_set: 2,
  shipping_set: 3,
  ready: 4,
  completed: 5,
};
const STEP_LABELS = ["Address", "Shipping", "Payment", "Review"] as const;

const EMPTY_ADDRESS: AddressFormValues = {
  full_name: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  post_code: "",
  country: "VN",
};

/**
 * Checkout Flow — the RFC-0015 session funnel (single entry since the legacy
 * one-shot checkout was removed): POST/PUT
 * /checkout/v1/private/checkout/sessions[…].
 */
export default function CheckoutFlowPage() {
  const navigate = useNavigate();
  const { mutate: globalMutate, cache } = useSWRConfig();

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [address, setAddressForm] = useState<AddressFormValues>(EMPTY_ADDRESS);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>(
    SHIPPING_METHODS[0]?.key ?? "standard",
  );
  const [paymentToken, setPaymentToken] = useState<string>(
    PAYMENT_METHODS[0]?.token ?? "tok_visa",
  );
  // null = follow the server FSM; a number = the user navigated back via the
  // stepper (the server legally re-enters earlier states on re-submit).
  const [stepOverride, setStepOverride] = useState<number | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const isAuthenticated = hasStoredToken();

  const bootSession = useCallback(async () => {
    setLoadError(null);
    setStepOverride(null);
    try {
      const s = await createSession();
      setSession(s);
      if (s.address) {
        const saved = s.address;
        setAddressForm((prev) => ({
          ...prev,
          ...saved,
          line2: saved.line2 ?? "",
          region: saved.region ?? "",
          post_code: saved.post_code ?? "",
        }));
      }
      if (s.shipping_method) setShippingMethod(s.shipping_method);
    } catch (err) {
      const appErr = toAppError(err);
      if (appErr.code === "CONFLICT") setLoadError("empty-cart");
      else setLoadError(appErr.message);
    }
  }, []);

  // POST /sessions is not idempotent — guard the boot effect so StrictMode's
  // dev double-invocation (and any dep-triggered re-run) can't create two
  // sessions for one mounted funnel.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated) {
      void navigate("/login?returnTo=/checkout");
      return;
    }
    if (bootedRef.current) return;
    bootedRef.current = true;
    void bootSession();
  }, [isAuthenticated, navigate, bootSession]);

  const serverStep = session ? (STEP_OF_STATUS[session.status] ?? 1) : 1;
  const step = stepOverride ?? serverStep;

  // Move focus to the step heading when the visible step changes (a11y).
  useEffect(() => {
    headingRef.current?.focus?.();
  }, [step]);

  // Shared error handling for every funnel mutation: expired sessions are
  // recreated; a requote (409 with a `session` body) re-renders the fresh
  // quote — the Idempotency-Key is NOT consumed and stays reusable.
  const handleFunnelError = (err: unknown) => {
    const appErr = toAppError(err);
    if (appErr.isRateLimit) {
      notify.info(appErr.message);
      return;
    }
    if (appErr.status === 410) {
      notify.error(toUserFriendlyError(null, "SESSION_EXPIRED"));
      void bootSession();
      return;
    }
    if (appErr.session) {
      setSession(appErr.session);
    }
    notify.error(appErr.message);
  };

  const run = async (
    fn: () => Promise<CheckoutSession>,
  ): Promise<CheckoutSession | null> => {
    setBusy(true);
    try {
      const s = await fn();
      setSession(s);
      return s;
    } catch (err) {
      handleFunnelError(err);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const submitAddress = async (values: AddressFormValues) => {
    if (!session) return;
    setAddressForm(values);
    const s = await run(() => setAddress(session.id, values));
    if (s) setStepOverride(null);
  };
  const submitShipping = async () => {
    if (!session) return;
    const s = await run(() => setShipping(session.id, shippingMethod));
    if (s) setStepOverride(null);
  };
  const submitPayment = async () => {
    if (!session) return;
    const s = await run(() => setPayment(session.id, paymentToken));
    if (s) setStepOverride(null);
  };

  const submitApplyPromo = async (code: string): Promise<boolean> => {
    if (!session) return false;
    setPromoError(null);
    setBusy(true);
    try {
      const s = await applyPromo(session.id, code);
      setSession(s);
      notify.success("Promo applied — totals updated.");
      return true;
    } catch (err) {
      const appErr = toAppError(err);
      if (appErr.session) setSession(appErr.session);
      setPromoError(appErr.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const submitRemovePromo = async () => {
    if (!session) return;
    setPromoError(null);
    await run(() => removePromo(session.id));
  };

  const submitConfirm = async () => {
    if (!session) return;
    setBusy(true);
    const toastId = notify.loading("Placing order...");
    try {
      const key = idempotencyKeyFor(session.id);
      const s = await confirmSession(session.id, key);
      setSession(s);
      clearIdempotencyKey(session.id);
      notify.dismiss(toastId);
      notify.success("Order placed successfully");
      void globalMutate("cart-count");
      void globalMutate("cart");
    } catch (err) {
      notify.dismiss(toastId);
      handleFunnelError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!session) return;
    try {
      await cancelSession(session.id);
      clearIdempotencyKey(session.id);
      notify.success("Checkout cancelled.");
      void navigate("/cart");
    } catch (err) {
      handleFunnelError(err);
    }
  };

  // Rebuild the quote from the current cart: the session pins items at
  // creation, so a cart edited afterwards diverges silently.
  const handleRebuildQuote = async () => {
    if (!session) return;
    setBusy(true);
    try {
      await cancelSession(session.id);
      clearIdempotencyKey(session.id);
    } catch {
      /* stale/expired session — safe to continue */
    }
    setBusy(false);
    await bootSession();
  };

  const priceChanged = session?.items.some((it) => it.price_changed);
  // Session ≠ cart detection: compare against the cart-count SWR cache the
  // navbar keeps fresh (no extra request from this page).
  const cartCount = (cache.get("cart-count")?.data as CartCount | undefined)?.count;
  const sessionCount = session?.items.reduce((n, it) => n + it.quantity, 0);
  const cartDiverged =
    !!session &&
    session.status !== "completed" &&
    Number.isFinite(cartCount) &&
    Number.isFinite(sessionCount) &&
    cartCount !== sessionCount;

  return (
    <PageShell>
      <h2 ref={headingRef} tabIndex={-1} className="mb-4 text-xl font-semibold tracking-tight">
        Checkout
      </h2>

      {loadError === "empty-cart" && (
        <EmptyState
          icon="🛒"
          message="Your cart is empty — add items before checking out."
        />
      )}
      {loadError && loadError !== "empty-cart" && (
        <AppError error={loadError} onRetry={() => void bootSession()} />
      )}
      {!session && !loadError && <LoadingState variant="card" count={2} />}

      {/* Success */}
      {session?.status === "completed" && (
        <Card className="mx-auto max-w-md text-center">
          <CardContent className="space-y-4 pt-6">
            <div aria-hidden="true" className="text-4xl">✅</div>
            <h3 className="text-lg font-semibold">Order placed!</h3>
            <p className="text-sm text-muted-foreground">
              Order #{session.order_id} · {formatCurrency(session.total)}
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => void navigate("/orders")}>View orders</Button>
              <Button variant="outline" onClick={() => void navigate("/products")}>
                Continue shopping
              </Button>
            </div>
            <ApiDebug data={session} />
          </CardContent>
        </Card>
      )}

      {session && session.status !== "completed" && (
        <>
          <Stepper
            labels={STEP_LABELS}
            current={step}
            disabled={busy}
            onStepClick={setStepOverride}
          />

          {priceChanged && (
            <Alert className="mb-4 border-warning" role="alert">
              <AlertDescription>
                Some prices or availability changed since you carted these
                items — the quote below uses the current catalog. Items marked{" "}
                <em>price updated</em> were adjusted.
              </AlertDescription>
            </Alert>
          )}

          {cartDiverged && (
            <Alert className="mb-4 border-info" role="status">
              <AlertDescription>
                Your cart changed after this quote was created — the summary
                reflects the older snapshot.
              </AlertDescription>
              <AlertAction>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleRebuildQuote()}
                  disabled={busy}
                >
                  Rebuild quote
                </Button>
              </AlertAction>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardContent className="pt-6">
                {step === 1 && (
                  <AddressStep
                    address={address}
                    onSubmit={(values) => void submitAddress(values)}
                    busy={busy}
                  />
                )}
                {step === 2 && (
                  <ShippingStep
                    method={shippingMethod}
                    onChange={setShippingMethod}
                    onSubmit={() => void submitShipping()}
                    onEditAddress={() => setStepOverride(1)}
                    busy={busy}
                  />
                )}
                {step === 3 && (
                  <PaymentStep
                    token={paymentToken}
                    onChange={setPaymentToken}
                    onSubmit={() => void submitPayment()}
                    busy={busy}
                  />
                )}
                {step === 4 && (
                  <ReviewStep
                    session={session}
                    onConfirm={() => void submitConfirm()}
                    busy={busy}
                  />
                )}
              </CardContent>
            </Card>

            <OrderSummary
              session={session}
              busy={busy}
              promoError={promoError}
              onApplyPromo={submitApplyPromo}
              onRemovePromo={() => void submitRemovePromo()}
              onCancel={handleCancel}
            />
          </div>
          <ApiDebug data={session} />
        </>
      )}
    </PageShell>
  );
}
