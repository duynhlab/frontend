// Test payment tokens — opaque references, never card data (the mock
// provider approves/declines by amount, not token).
export const PAYMENT_METHODS = [
    { token: 'tok_visa', label: 'Visa test card' },
    { token: 'tok_mastercard', label: 'Mastercard test card' },
];

export const SHIPPING_METHODS = [
    { key: 'standard', label: 'Standard' },
    { key: 'express', label: 'Express' },
];
