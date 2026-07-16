import { toUserFriendlyError } from '../../utils/errorMessages';

/**
 * ApiError Component
 * Displays user-friendly error messages (never raw backend errors).
 */
export default function ApiError({ error, endpoint, onRetry }) {
    // Accept both strings and Error objects (SWR/axios pass the object).
    // A gateway rate-limit carries a calm, ready-to-show message — don't
    // collapse it into the generic fallback.
    const message = error?.isRateLimit
        ? error.message
        : toUserFriendlyError(typeof error === 'string' ? error : error?.message);
    return (
        <div className="error-box">
            <strong>Error:</strong> {message}
            {endpoint && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
                    Endpoint: {endpoint}
                </p>
            )}
            {onRetry && (
                <button
                    type="button"
                    className="primary"
                    style={{ marginTop: '0.75rem' }}
                    onClick={onRetry}
                >
                    Try Again
                </button>
            )}
        </div>
    );
}
