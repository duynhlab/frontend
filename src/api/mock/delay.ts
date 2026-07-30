/** Simulated network latency so loading states are visible in mock mode. */
export function mockDelay(ms = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
