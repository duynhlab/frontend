import type { CheckoutSession } from "@/api/types/checkout";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

interface ReviewStepProps {
  session: CheckoutSession;
  onConfirm: () => void;
  busy: boolean;
}

export default function ReviewStep({ session, onConfirm, busy }: ReviewStepProps) {
  const a = session.address;
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Review &amp; confirm</h3>
      {a && (
        <p className="text-sm">
          Ship to: <strong>{a.full_name}</strong>, {a.line1}, {a.city}, {a.country}{" "}
          — {session.shipping_method}
        </p>
      )}
      <Button onClick={onConfirm} disabled={busy} aria-busy={busy}>
        {busy
          ? "Placing order…"
          : `Place order — ${formatCurrency(session.total)}`}
      </Button>
      <p className="text-sm text-muted-foreground">
        Double-clicks and retries are safe: this button is idempotent.
      </p>
    </div>
  );
}
