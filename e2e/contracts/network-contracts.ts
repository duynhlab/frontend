import { expect, type Request } from "@playwright/test";

export interface RecordedCall {
  method: string;
  pathname: string;
  search: string;
  headers: Record<string, string>;
  postData: string | null;
}

export interface ContractExpectation {
  method: string;
  path: RegExp;
  /** Exact call count; omitted = at least one. */
  times?: number;
  /** Header assertions applied to every matching call. */
  headers?: Record<string, RegExp>;
  /** Body assertion applied to every matching call (throw/expect inside). */
  body?: (body: unknown) => void;
  /** Label for failure messages. */
  label?: string;
}

/**
 * NetworkContract — records every API request the suite's mock layer sees and
 * verifies, at fixture teardown, that:
 *   1. every registered expectation fired (exactly `times` when given) —
 *      a mutation test can no longer pass on UI state alone;
 *   2. no request hit an unmocked API route (the dispatcher records those);
 *   3. global invariants hold: no `/internal` audience, no added `/api`
 *      prefix, and every `/v1/private/` call carries a Bearer token.
 */
export class NetworkContract {
  private readonly recorded: RecordedCall[] = [];
  private readonly expectations: ContractExpectation[] = [];
  private readonly unmocked: string[] = [];

  record(request: Request): RecordedCall {
    const url = new URL(request.url());
    const call: RecordedCall = {
      method: request.method(),
      pathname: url.pathname,
      search: url.search,
      headers: request.headers(),
      postData: request.postData(),
    };
    this.recorded.push(call);
    return call;
  }

  recordUnmocked(request: Request): void {
    const url = new URL(request.url());
    this.unmocked.push(`${request.method()} ${url.pathname}`);
  }

  expectCall(spec: ContractExpectation): void {
    this.expectations.push(spec);
  }

  calls(method: string, path: RegExp): RecordedCall[] {
    return this.recorded.filter(
      (c) => c.method === method && path.test(c.pathname),
    );
  }

  /** Total number of recorded API calls (proof-of-interception checks). */
  get totalCalls(): number {
    return this.recorded.length;
  }

  verify(): void {
    expect
      .soft(this.unmocked, "requests reached the API with no mock handler")
      .toEqual([]);

    for (const call of this.recorded) {
      expect
        .soft(call.pathname, `forbidden /internal audience: ${call.pathname}`)
        .not.toMatch(/\/internal\//);
      expect
        .soft(call.pathname, `unexpected /api prefix: ${call.pathname}`)
        .not.toMatch(/^\/api\//);
      if (call.pathname.includes("/v1/private/")) {
        expect
          .soft(
            call.headers["authorization"] ?? "",
            `missing Bearer on private call ${call.method} ${call.pathname}`,
          )
          .toMatch(/^Bearer .+/);
      }
    }

    for (const spec of this.expectations) {
      const matches = this.calls(spec.method, spec.path);
      const label = spec.label ?? `${spec.method} ${spec.path}`;
      if (spec.times !== undefined) {
        expect(matches, `expected exactly ${spec.times}× ${label}`).toHaveLength(
          spec.times,
        );
      } else {
        expect(
          matches.length,
          `expected at least one ${label}`,
        ).toBeGreaterThan(0);
      }
      for (const call of matches) {
        if (spec.headers) {
          for (const [name, pattern] of Object.entries(spec.headers)) {
            expect(
              call.headers[name.toLowerCase()] ?? "",
              `header ${name} on ${label}`,
            ).toMatch(pattern);
          }
        }
        if (spec.body) {
          spec.body(call.postData === null ? null : JSON.parse(call.postData));
        }
      }
    }
  }
}
