import { formatCurrency } from '@/lib/format';

export default function ReviewStep({ session, onConfirm, busy }) {
    const a = session.address || {};
    return (
        <div className="checkout-step">
            <h3>Review &amp; confirm</h3>
            <p>
                Ship to: <strong>{a.full_name}</strong>, {a.line1}, {a.city},{' '}
                {a.country} — {session.shipping_method}
            </p>
            <div className="step-actions">
                <button
                    className="primary"
                    onClick={onConfirm}
                    disabled={busy}
                    aria-busy={busy}
                >
                    {busy ? 'Placing order…' : `Place order — ${formatCurrency(session.total)}`}
                </button>
            </div>
            <p className="text-muted payment-method-hint">
                Double-clicks and retries are safe: this button is idempotent.
            </p>
        </div>
    );
}
