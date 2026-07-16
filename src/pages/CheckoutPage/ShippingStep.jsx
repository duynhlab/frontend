import { SHIPPING_METHODS } from './constants';

export default function ShippingStep({ method, onChange, onSubmit, onEditAddress, busy }) {
    return (
        <form className="checkout-step" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            <fieldset>
                <legend>Shipping method</legend>
                {SHIPPING_METHODS.map((m) => (
                    <label key={m.key} className="payment-method-option">
                        <input
                            type="radio"
                            name="shipping-method"
                            value={m.key}
                            checked={method === m.key}
                            onChange={() => onChange(m.key)}
                        />
                        <span>{m.label}</span>
                    </label>
                ))}
            </fieldset>
            <p className="text-muted">
                The fee is quoted by shipping-service for your destination;
                tax applies on subtotal + fee.
            </p>
            <div className="step-actions">
                <button className="primary" type="submit" disabled={busy} aria-busy={busy}>
                    {busy ? 'Quoting…' : 'Continue to payment'}
                </button>
                <button type="button" onClick={onEditAddress} disabled={busy}>
                    Edit address
                </button>
            </div>
        </form>
    );
}
