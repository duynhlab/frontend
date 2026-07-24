import { useState, useCallback } from 'react';
import { useToast } from '../hooks/useToast';

/**
 * useApiMutation Hook
 * Standard mutation wrapper with loading state and optional toast notifications
 *
 * Usage:
 *   const { mutate, loading, error } = useApiMutation(updateProfile, {
 *     onSuccess: () => console.log('Updated!'),
 *     successMessage: 'Profile updated!',
 *     errorMessage: 'Failed to update profile',
 *     loadingMessage: 'Saving...',
 *   });
 *
 * @param {function} mutationFn - Async function to call
 * @param {object} options - Configuration options
 */
export function useApiMutation(mutationFn, options = {}) {
    const {
        onSuccess,
        onError,
        successMessage,
        errorMessage,
        loadingMessage,
        showToast: enableToast = true,
    } = options;

    const { notify, promise: toastPromise } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(async (...args) => {
        setLoading(true);
        setError(null);

        const runMutation = async () => {
            const result = await mutationFn(...args);
            if (onSuccess) {
                onSuccess(result);
            }
            return result;
        };

        const handleError = (err) => {
            const message = err?.message || errorMessage || 'An error occurred';
            setError(message);

            if (enableToast) {
                if (err?.isRateLimit) {
                    notify('warning', message);
                } else if (!loadingMessage) {
                    notify('error', errorMessage || message);
                }
            }

            if (onError) {
                onError(err);
            }

            return null;
        };

        try {
            if (enableToast && loadingMessage) {
                const result = await toastPromise(runMutation(), {
                    loading: loadingMessage,
                    success: successMessage || 'Done',
                    error: (err) => errorMessage || err?.message || 'An error occurred',
                });
                return result;
            }

            const result = await runMutation();

            if (enableToast && successMessage) {
                notify('success', successMessage);
            }

            return result;
        } catch (err) {
            return handleError(err);
        } finally {
            setLoading(false);
        }
    }, [
        mutationFn,
        onSuccess,
        onError,
        successMessage,
        errorMessage,
        loadingMessage,
        enableToast,
        notify,
        toastPromise,
    ]);

    const reset = useCallback(() => {
        setError(null);
    }, []);

    return {
        mutate,
        loading,
        error,
        reset,
    };
}

export default useApiMutation;
