import { PAYMENT_METHODS } from './constants';

export default function PaymentStep({ token, onChange, onSubmit, busy }) {
    return (
        <form className="checkout-step" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            <fieldset>
                <legend>Payment method</legend>
                {PAYMENT_METHODS.map((m) => (
                    <label key={m.token} className="payment-method-option">
                        <input
                            type="radio"
                            name="payment-method"
                            value={m.token}
                            checked={token === m.token}
                            onChange={() => onChange(m.token)}
                        />
                        <span>{m.label}</span>
                        <code className="text-muted">{m.token}</code>
                    </label>
                ))}
            </fieldset>
            <p className="text-muted payment-method-hint">
                Test tokens only — never real card data.
            </p>
            <div className="step-actions">
                <button className="primary" type="submit" disabled={busy} aria-busy={busy}>
                    {busy ? 'Saving…' : 'Review order'}
                </button>
            </div>
        </form>
    );
}
