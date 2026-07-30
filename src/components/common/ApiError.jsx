import { toUserFriendlyError } from '@/lib/errors';

/**
 * ApiError Component
 * Displays user-friendly error messages (never raw backend errors).
 */
export default function ApiError({ error, endpoint, onRetry }) {
    // Hooks pass a normalized AppError whose message is already
    // user-friendly (rate-limit copy included); raw strings from legacy
    // callers still go through the friendly mapping.
    const message = typeof error === 'string'
        ? toUserFriendlyError(error)
        : (error?.message || toUserFriendlyError(null));
    return (
        <div className="error-box" role="alert">
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
