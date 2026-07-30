/**
 * Builds an Error carrying an axios-shaped `.response` so `toAppError` and the
 * error envelope handling work identically in mock mode and against Kong.
 */
export interface MockApiError extends Error {
  response: {
    status: number;
    data: { error: string; code?: string };
  };
  isRateLimit?: boolean;
}

export function mockError(
  message: string,
  status = 400,
  code: string | null = null,
): MockApiError {
  const error = new Error(message) as MockApiError;
  error.response = {
    status,
    data: code ? { error: message, code } : { error: message },
  };
  return error;
}
