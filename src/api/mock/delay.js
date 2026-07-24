/** Simulate network latency in mock mode. */
export function mockDelay(ms = 200) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
