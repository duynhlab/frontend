const FIELDS = [
    ['full_name', 'Full name', true, 'full'],
    ['line1', 'Address line 1', true, 'full'],
    ['line2', 'Address line 2', false, 'full'],
    ['city', 'City', true, ''],
    ['region', 'Region/State', false, ''],
    ['post_code', 'Postal code', false, ''],
    ['country', 'Country code', true, ''],
];

export default function AddressStep({ address, onChange, onSubmit, busy }) {
    return (
        <form className="checkout-step" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            <h3>Shipping address</h3>
            <div className="form-grid">
                {FIELDS.map(([field, label, required, span]) => (
                    <label key={field} className={`form-field ${span}`}>
                        <span>{label}{required ? ' *' : ''}</span>
                        <input
                            value={address[field]}
                            required={required}
                            maxLength={field === 'country' ? 2 : undefined}
                            autoComplete={field === 'country' ? 'country' : undefined}
                            onChange={(e) => onChange({ ...address, [field]: e.target.value })}
                        />
                    </label>
                ))}
            </div>
            <div className="step-actions">
                <button className="primary" type="submit" disabled={busy} aria-busy={busy}>
                    {busy ? 'Saving…' : 'Continue to shipping'}
                </button>
            </div>
        </form>
    );
}
