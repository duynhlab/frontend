import { toast } from "@/components/ui/toast";
import { toAppError, type AppError } from "@/lib/errors";

/**
 * Project notification API — the ONLY way application code raises toasts.
 * A thin module singleton over the shadcn (Base UI) toast manager: it
 * standardises types/wording and keeps pages decoupled from the toast
 * implementation. Mount exactly one <Toaster /> at the app root (AGENTS.md).
 *
 * Not a hook — the manager is a stable singleton, so `useApiMutation` and
 * friends don't churn callback identities the way the old useToast() did.
 */

export interface NotifyOptions {
  /** Secondary line under the title. */
  description?: string;
  /**
   * Stable key for deduplication: re-notifying with the same key updates the
   * existing toast in place (Base UI refreshes its auto-dismiss timer) instead
   * of stacking a duplicate — e.g. rapid "Added to cart" clicks.
   */
  dedupKey?: string;
  /** Auto-dismiss override in ms. */
  timeout?: number;
}

type ToastType = "success" | "error" | "info" | "warning" | "loading";

function add(type: ToastType, title: string, options?: NotifyOptions): string {
  return toast.add({
    type,
    title,
    ...(options?.description !== undefined && {
      description: options.description,
    }),
    ...(options?.dedupKey !== undefined && { id: options.dedupKey }),
    ...(options?.timeout !== undefined && { timeout: options.timeout }),
  });
}

export interface PromiseMessages<T> {
  loading: string;
  success: string | ((result: T) => string);
  error: string | ((error: AppError) => string);
}

export const notify = {
  success: (title: string, options?: NotifyOptions): string =>
    add("success", title, options),

  error: (title: string, options?: NotifyOptions): string =>
    add("error", title, options),

  info: (title: string, options?: NotifyOptions): string =>
    add("info", title, options),

  warning: (title: string, options?: NotifyOptions): string =>
    add("warning", title, options),

  /** Sticky loading toast; resolve it via dismiss(id) or promise(). */
  loading: (title: string, options?: NotifyOptions): string =>
    add("loading", title, { timeout: 0, ...options }),

  /** Dismiss one toast by id, or every toast when no id is given. */
  dismiss: (id?: string): void => {
    toast.close(id);
  },

  /**
   * Loading → success/error in a single toast (no second toast is created).
   * Returns the original promise result; rejections are re-thrown.
   */
  promise: <T>(promise: Promise<T>, messages: PromiseMessages<T>): Promise<T> =>
    toast.promise(promise, {
      loading: messages.loading,
      success:
        typeof messages.success === "function"
          ? (result: T) => (messages.success as (r: T) => string)(result)
          : messages.success,
      error:
        typeof messages.error === "function"
          ? (error: unknown) =>
              (messages.error as (e: AppError) => string)(toAppError(error))
          : messages.error,
    }),

  /** Error toast with the normalized, user-friendly message for any thrown value. */
  apiError: (error: unknown, fallback?: string): string =>
    add("error", toAppError(error, fallback).message),
};
