import { useState } from 'react';
import { formatCurrency } from '@/lib/format';

/**
 * Live quote panel: per-item rows (with price-changed badges), the totals
 * ladder, and the promo box. Promo failures render inline here — next to the
 * control that caused them — instead of a transient toast.
 */
export default function OrderSummary({
    session, busy, promoError,
    onApplyPromo, onRemovePromo, onCancel,
}) {
    const [promoCode, setPromoCode] = useState('');

    const submitPromo = (e) => {
        e.preventDefault();
        const code = promoCode.trim().toUpperCase();
        if (code) onApplyPromo(code).then((ok) => { if (ok) setPromoCode(''); });
    };

    return (
        <div className="card checkout-summary">
            <h3>Order summary</h3>
            <ul className="summary-items">
                {session.items?.map((it) => (
                    <li key={it.product_id}>
                        <span className="item-name">
                            {it.product_name} <span className="item-qty">× {it.quantity}</span>
                            {it.price_changed && <span className="badge-price-changed">price updated</span>}
                        </span>
                        <span>{formatCurrency(it.unit_price * it.quantity)}</span>
                    </li>
                ))}
            </ul>
            <div className="summary-totals">
                <div className="row"><span>Subtotal</span><span>{formatCurrency(session.subtotal)}</span></div>
                {session.discount > 0 && (
                    <div className="row discount">
                        <span>Discount ({session.promo_code})</span>
                        <span>−{formatCurrency(session.discount)}</span>
                    </div>
                )}
                <div className="row"><span>Shipping</span><span>{formatCurrency(session.shipping_fee)}</span></div>
                <div className="row"><span>Tax</span><span>{formatCurrency(session.tax)}</span></div>
                <div className="row grand"><span>Total</span><span>{formatCurrency(session.total)}</span></div>
            </div>

            {/* Promo: a validated preview — the use is only counted at confirm */}
            <div className="promo-box">
                {session.promo_code ? (
                    <div className="promo-applied">
                        <span>Code <strong>{session.promo_code}</strong> applied</span>
                        <button type="button" onClick={onRemovePromo} disabled={busy}>Remove</button>
                    </div>
                ) : (
                    <form onSubmit={submitPromo}>
                        <input
                            placeholder="Promo code"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            aria-label="Promo code"
                        />
                        <button type="submit" disabled={busy || !promoCode.trim()}>Apply</button>
                    </form>
                )}
                {promoError && <p className="promo-error" role="alert">{promoError}</p>}
            </div>

            <div className="step-actions">
                <button type="button" onClick={onCancel} disabled={busy}>
                    Cancel checkout
                </button>
            </div>
        </div>
    );
}
