import { test as base, expect } from "@playwright/test";

interface MockModeFixtures {
  /** Every request that tried to leave the app origin (blocked + recorded). */
  leakedRequests: string[];
  /** Console errors + uncaught page errors collected during the test. */
  runtimeErrors: string[];
}

/**
 * Mock-mode test base. NO route mocks — the in-app mock store serves
 * everything. Two auto tripwires:
 *   1. any request leaving the app origin is blocked AND fails the test
 *      (offline mode must be truly offline);
 *   2. console errors / uncaught exceptions fail the test.
 */
export const test = base.extend<MockModeFixtures>({
  leakedRequests: [
    async ({ context, baseURL }, use) => {
      const leaked: string[] = [];
      const appOrigin = new URL(baseURL ?? "http://localhost:3100").origin;
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === appOrigin) {
          await route.fallback();
          return;
        }
        leaked.push(`${route.request().method()} ${url.href}`);
        await route.abort("blockedbyclient");
      });
      await use(leaked);
      expect(leaked, "mock mode must not emit external requests").toEqual([]);
    },
    { auto: true },
  ],

  runtimeErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(`console.error: ${message.text()}`);
        }
      });
      page.on("pageerror", (error) => {
        errors.push(`pageerror: ${error.message}`);
      });
      await use(errors);
      expect(errors, "mock mode must run without runtime errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
