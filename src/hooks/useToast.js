import toast from 'react-hot-toast';
import { parseApiError } from '../utils/parseApiError';
import { toUserFriendlyError } from '../utils/errorMessages';

/**
 * Maps API/Kong errors to user-friendly toast copy.
 * Prefers checkout codes via toUserFriendlyError; falls back to HTTP status.
 */
export function resolveApiErrorMessage(error, fallback = 'Something went wrong') {
    const { code, message, status, isRateLimit } = parseApiError(error);

    if (isRateLimit && message) return message;

    if (code) {
        const friendly = toUserFriendlyError(message, code);
        if (friendly) return friendly;
    }

    const httpStatus = status ?? error?.status ?? error?.response?.status;

    if (
        !httpStatus
        && (error?.code === 'ERR_NETWORK'
            || error?.message?.toLowerCase().includes('network'))
    ) {
        return 'Cannot reach server';
    }

    if (httpStatus === 400) return 'Invalid request';
    if (httpStatus === 401) return 'Please sign in again';
    if (httpStatus === 403) return 'You do not have permission';
    if (httpStatus === 404) return 'Resource not found';
    if (httpStatus === 409) return 'Conflict. Please refresh and try again';
    if (httpStatus === 422) return 'Please check your input';
    if (httpStatus === 429) return 'Too many requests. Please wait a moment';
    if (httpStatus >= 500) return 'Service temporarily unavailable';

    if (message) return message;

    return fallback;
}

export function useToast() {
    const notify = (type, message, options) => {
        if (type === 'success') return toast.success(message, options);
        if (type === 'error') return toast.error(message, options);
        if (type === 'warning') {
            return toast(message, { icon: '⚠', ...options });
        }
        if (type === 'info') {
            return toast(message, { icon: 'ℹ', ...options });
        }

        return toast(message, options);
    };

    return {
        notify,

        success(message, options) {
            return toast.success(message, options);
        },

        error(message, options) {
            return toast.error(message, options);
        },

        info(message, options) {
            return toast(message, { icon: 'ℹ', ...options });
        },

        warning(message, options) {
            return toast(message, { icon: '⚠', ...options });
        },

        loading(message, options) {
            return toast.loading(message, options);
        },

        dismiss(id) {
            return toast.dismiss(id);
        },

        promise(promise, messages, options) {
            return toast.promise(promise, messages, options);
        },

        apiError(error, fallback) {
            return toast.error(resolveApiErrorMessage(error, fallback));
        },
    };
}

export default useToast;
