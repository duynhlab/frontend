import { useCallback, useState } from "react";
import { notify } from "@/lib/notifications";
import { toAppError, type AppError } from "@/lib/errors";

export interface UseApiMutationOptions<TData> {
  onSuccess?: (result: TData) => void;
  onError?: (error: AppError) => void;
  successMessage?: string;
  errorMessage?: string;
  /** When set, wraps the call in a loading→success/error toast. */
  loadingMessage?: string;
  showToast?: boolean;
}

/**
 * useApiMutation Hook
 * Standard mutation wrapper with loading state and optional toast notifications.
 *
 * Usage:
 *   const { mutate, loading, error } = useApiMutation(updateProfile, {
 *     onSuccess: () => console.log('Updated!'),
 *     successMessage: 'Profile updated!',
 *     errorMessage: 'Failed to update profile',
 *     loadingMessage: 'Saving...',
 *   });
 */
export function useApiMutation<TArgs extends unknown[], TData>(
  mutationFn: (...args: TArgs) => Promise<TData>,
  options: UseApiMutationOptions<TData> = {},
): {
  mutate: (...args: TArgs) => Promise<TData | null>;
  loading: boolean;
  error: AppError | null;
  reset: () => void;
} {
  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    loadingMessage,
    showToast: enableToast = true,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const mutate = useCallback(
    async (...args: TArgs): Promise<TData | null> => {
      setLoading(true);
      setError(null);

      const runMutation = async (): Promise<TData> => {
        const result = await mutationFn(...args);
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      };

      const handleError = (err: unknown): null => {
        const appError = toAppError(err, errorMessage);
        setError(appError);

        if (enableToast) {
          if (appError.isRateLimit) {
            notify.warning(appError.message);
          } else if (!loadingMessage) {
            notify.error(errorMessage || appError.message);
          }
        }

        if (onError) {
          onError(appError);
        }

        return null;
      };

      try {
        if (enableToast && loadingMessage) {
          return await notify.promise(runMutation(), {
            loading: loadingMessage,
            success: successMessage || "Done",
            error: (appError) => errorMessage || appError.message,
          });
        }

        const result = await runMutation();

        if (enableToast && successMessage) {
          notify.success(successMessage);
        }

        return result;
      } catch (err) {
        return handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [
      mutationFn,
      onSuccess,
      onError,
      successMessage,
      errorMessage,
      loadingMessage,
      enableToast,
    ],
  );

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
