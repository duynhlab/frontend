import type { BrowserContext, Request, Route } from "@playwright/test";
import type { NetworkContract } from "../contracts/network-contracts";
import type { MockState } from "./state";
import { handlers } from "./handlers";

export interface HandlerContext {
  state: MockState;
  route: Route;
  request: Request;
  url: URL;
}

export interface ApiHandler {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: RegExp;
  fulfill: (ctx: HandlerContext) => Promise<void> | void;
}

export function json(
  route: Route,
  body: unknown,
  status = 200,
): Promise<void> {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export function apiError(
  route: Route,
  message: string,
  status: number,
  code?: string,
): Promise<void> {
  return json(route, code ? { error: message, code } : { error: message }, status);
}

const API_PATH =
  /^\/(auth|product|cart|order|review|user|notification|checkout|shipping)\/v1\//;

/**
 * installApiMocks — ONE dispatcher route for the whole API surface.
 *
 * Every API request is recorded into the NetworkContract; a request with no
 * method+path handler is fulfilled 501 AND recorded as unmocked, failing the
 * test at contract.verify() — silent gaps and forgotten endpoints are
 * impossible. Per-test overrides still work: page.route handlers registered
 * inside a spec run before this context-level dispatcher.
 */
export async function installApiMocks(
  context: BrowserContext,
  {
    state,
    contract,
  }: {
    state: MockState;
    contract: NetworkContract;
  },
): Promise<void> {
  await context.route(
    (url) => API_PATH.test(url.pathname),
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      contract.record(request);

      const handler = handlers.find(
        (h) => h.method === request.method() && h.path.test(url.pathname),
      );
      if (!handler) {
        contract.recordUnmocked(request);
        await json(
          route,
          { error: `No mock handler for ${request.method()} ${url.pathname}` },
          501,
        );
        return;
      }
      await handler.fulfill({ state, route, request, url });
    },
  );
}
