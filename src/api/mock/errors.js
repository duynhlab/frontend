/** Axios-shaped error for mock handlers (parseApiError-compatible). */
export function mockError(message, status = 400, code = null) {
    const err = new Error(message);
    err.response = {
        status,
        data: code ? { error: message, code } : { error: message },
    };
    return err;
}
