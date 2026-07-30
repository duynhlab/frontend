# AGENTS.md

Agent-focused guide for the `frontend` repository. Read this first.

## Contribution workflow

Commit rules (every commit an agent authors):

- **No attribution trailers.** Never add `Signed-off-by`, `Co-authored-by`,
  `Assisted-by`, `Generated-by`, or any trailer attributing work to an AI or tool.
- **Subject:** ≤ 50 chars, capitalised, imperative mood, no trailing period
  (`Add cart badge poller`, not `Added` / `Adds`).
- **Body** (only for non-trivial changes): explain *what* and *why*, wrap at 72 chars,
  one blank line after the subject.
- **No issue references** (`Fixes #123`, `Closes #123`) in the message — put them in the PR.
- **No GitHub @-mentions** of users or teams.

Branch-then-PR:

- **Never push to `main`.** Branch first.
- Branch name: `feat|fix|chore|docs|refactor|ci/<short-desc>` (e.g. `feat/checkout-coupon`).
- Open a PR against `main`. **Squash-merge.**
- CI on PRs runs lint, typecheck, build, and Playwright E2E
  (`.github/workflows/check.yml`). Keep it green.

## Skill routing

Use installed skills only when relevant to the current task. Do not load the
entire skill pack for every change.

- Use `source-driven-development` before making version-sensitive framework or
  tooling decisions.
- Use `deprecation-and-migration` for removal of JavaScript, legacy CSS,
  `react-hot-toast`, dependencies, and obsolete configuration.
- Use `frontend-ui-engineering` for component and page migration.
- Use `test-driven-development` when changing observable behavior.
- Use `security-and-hardening` for auth, token, interceptor, and session changes.
- Use `performance-optimization` for bundle and runtime performance work.
- Use `code-review-and-quality` before declaring the migration complete.
- Use `documentation-and-adrs` when repository conventions or architectural
  decisions change.
- Use `shipping-and-launch` for cutover and rollback readiness.

Examples inside a generic skill do not override this repository's architecture.
In particular, keep SWR, Axios, React Router SPA mode, Nginx static hosting, and
Kong gateway integration unless an explicit task changes them.

Do not use `browser-testing-with-devtools`. Use Playwright for deterministic
regression tests and `agent-browser` for exploratory/dogfood validation.

## Code language

- **Application code and E2E tests use TypeScript/TSX.** Do not add new `.js` or
  `.jsx` files under `src/` or `e2e/`.
- **TypeScript strict mode is required** (`tsconfig.app.json`; also strict for
  `e2e/` via `tsconfig.e2e.json`). Never disable `strict`.
- Do not use `any`, `@ts-ignore`, or unchecked type assertions. Every
  `@ts-expect-error` needs a same-line reason and must be listed in the PR.
- `unknown` is allowed at external boundaries and must be narrowed before use.
  Axios errors go through `toAppError()` (`src/lib/errors.ts`) — pages never
  read `error.response.data.*` directly.
- Run `npm run typecheck` before handoff. `npm run build` also typechecks
  (`tsc -b && vite build`), so a type error fails the Docker image too.

## Styling

- **Use Tailwind CSS v4 utilities and the shared semantic theme tokens.**
- `src/index.css` is the only global stylesheet: the `@import "tailwindcss";`
  line, the `@theme` token block, base styles, and exceptional shared CSS only.
- Do not add page-level plain CSS files unless Tailwind cannot express the
  requirement clearly; document the reason next to the file.
- Do not hard-code duplicate colors, spacing, radius, or shadows outside tokens.
- The app ships a **single permanent dark theme** (`color-scheme: dark`); there
  is no theme toggle. Do not add one without an explicit task.
- Token gotcha: in shadcn semantics `--accent` is a **hover/selection surface**,
  not the brand color. The brand/indigo color is `--primary` (and `--ring`).
  Status colors (`--success`, `--warning`, `--info`, `--destructive`) are theme
  tokens — never invent per-page status colors. Policy: success = completed
  states only; warning = needs attention, not failed; destructive = delete/
  cancel actions or severe errors; muted = secondary text and must keep AA
  contrast.

## shadcn/ui ownership

- `src/components/ui/` contains **shadcn primitives only** (or deliberate,
  reviewed edits of them). No business logic, API calls, SWR hooks, or route
  behavior in `ui/`.
- **One foundation: Base UI**, locked in `components.json`. Do not mix Base UI
  and Radix variants; do not hand-edit the foundation field; dependency audits
  must show no `@radix-ui/*` packages.
- Add only components that are actually used; never run `shadcn add --all`.
- Reusable application patterns belong in `src/components/common/` (e.g.
  `ConfirmAction`, `EmptyState`, `AppError`, `AppPagination`) or in a feature.
- Business UI lives in `src/features/<domain>/` (auth, products, cart,
  checkout). Pages in `src/pages/` only compose.
- Component layering: Page → feature component → common wrapper → shadcn
  primitive. Simple components may use primitives directly, but a repeated
  business pattern must be wrapped once in `common/` or a feature — never
  re-derived per page.

## Notifications (toast)

- Use the project notification API `notify` from `src/lib/notifications.ts`,
  backed by the shadcn (Base UI) Toast. It is a module singleton, not a hook.
- Mount exactly **one** shadcn `<Toaster />` at the application root
  (`AppLayout`). Never mount a second one.
- **Do not add `react-hot-toast`, Sonner, or any other toast package.** Do not
  hand-roll a parallel toast implementation.
- Toast is for transient operation feedback. Use inline/field errors for
  actionable form errors, an inline `Alert` for errors the user must read or
  fix, a dialog (`ConfirmAction`) for destructive confirmation, and an empty
  state for "no data" (which is not an error).

## Forms and validation

- Use **React Hook Form** for multi-field business forms (login, register,
  profile, checkout steps, reviews).
- Use **Zod** for form schemas and for selected high-risk runtime API
  boundaries (auth and checkout responses — `src/api/schemas/`). Do not
  Zod-parse every API response by default.
- Backend field errors map to fields via `applyServerErrors()`
  (`src/lib/forms.ts`); non-field errors render as an inline alert, not a toast.
- Login is by **username**, not email — do not add email validation to the
  login username field.

## Code quality

- **Functional components + hooks only.** No class components.
- One component per file; keep components small; lift shared logic into
  `src/hooks/` and shared UI into `src/components/common/`.
- **Server state via SWR** (`src/hooks/useApiQuery.ts`, `useApiMutation.ts`) —
  do not hand-roll fetch-in-effect for data the API owns.
- **Never commit secrets or tokens.** The only runtime config is `VITE_*` env
  vars. `.env` is untracked — copy `.env.example`.
- **Accessible markup**: semantic elements, `alt` on images, labels associated
  with inputs (`htmlFor`/`id`), keyboard-reachable controls, `aria-label` on
  icon-only buttons.
- **Lint clean**: `npm run lint` must pass (includes `e2e/`, jsx-a11y, and
  Playwright rules). Prefix intentionally-unused vars with `_`.

## Project overview

`frontend` is the **React SPA** for the `duynhlab` e-commerce platform: browse products,
manage the cart, check out, view orders, profile, and notifications. It is a static
bundle (built by Vite, served by Nginx) that talks to the platform **only** over HTTP
through the Kong gateway.

## Repository layout

```
frontend/
├── src/
│   ├── api/              # Axios client + one module per backend service
│   │   ├── client.ts     #   shared axios instance, interceptors (auth, 401)
│   │   ├── config.ts     #   gateway origin from VITE_API_BASE_URL
│   │   ├── types/        #   request/response DTOs per service
│   │   ├── schemas/      #   Zod schemas for auth/checkout boundaries
│   │   ├── authApi.ts cartApi.ts productApi.ts orderApi.ts
│   │   ├── reviewApi.ts userApi.ts notificationApi.ts checkoutApi.ts
│   │   └── mock/         #   seed + in-memory store (VITE_USE_MOCK=true)
│   ├── auth/             # tokens.ts (token+user store), session.ts (logout)
│   ├── components/
│   │   ├── ui/           #   shadcn primitives (Base UI foundation) ONLY
│   │   ├── common/       #   reusable wrappers (ConfirmAction, EmptyState, …)
│   │   ├── layout/       #   AppLayout, AppHeader, MobileNavigation
│   │   └── ProtectedRoute.tsx
│   ├── features/         # business UI: auth/, products/, cart/, checkout/
│   ├── hooks/            # useAuth, useProducts, useApiQuery, useApiMutation
│   ├── lib/              # notifications.ts, errors.ts, forms.ts, utils.ts
│   ├── pages/            # route-level screens (compose only)
│   ├── App.tsx           # routes
│   └── main.tsx          # entry
├── e2e/                  # Playwright: smoke/, regression/, mock-mode/,
│                         #   gateway/, mocks/, pages/, fixtures/, contracts/
├── scripts/agent-browser/  # dogfood orchestration (smoke/a11y/visual)
├── components.json       # shadcn foundation lock — do not hand-edit
├── agent-browser.json
├── playwright.config.ts  # + playwright.mock-mode.config.ts, playwright.gateway.config.ts
├── tsconfig.json         # + tsconfig.app.json, tsconfig.node.json, tsconfig.e2e.json
├── vite.config.ts
├── Dockerfile            # multi-stage build → Nginx static serve
├── nginx.conf
└── package.json
```

## Build, test, lint

Node 24+, **npm only** (`package-lock.json`; CI uses `npm ci`).

```bash
npm install        # install deps
npm run dev        # Vite dev server, hot reload (port 3000)
npm run typecheck  # tsc, all projects (src + node configs + e2e)
npm run build      # typecheck + production bundle → dist/
npm run preview    # serve the built bundle locally
npm run lint       # ESLint (src + e2e + configs)
npm run test:e2e            # Playwright regression (mock OFF, route mocks ON)
npm run test:e2e:mock-mode  # mock-mode smoke (app mock ON, no route mocks, port 3100)
npm run test:e2e:gateway    # gateway smoke (no mocks; needs E2E_BASE_URL/E2E_GATEWAY_URL)
npm run test:e2e:ui         # Playwright UI mode (local debugging)
npm run test:agent:cutover  # agent-browser dogfood: smoke + a11y + visual
```

- First-time local setup: `npx playwright install chromium`
- Docker: `docker build -t frontend .` then `docker run -p 80:80 frontend`.

## Testing policy

- **Playwright is the deterministic E2E regression gate.** The main suite runs
  with `VITE_USE_MOCK=false` and Playwright `page.route()` network mocks, so
  Axios, interceptors, auth refresh, and Kong paths are actually exercised.
- **`VITE_USE_MOCK=true` is for local UI/offline development only.** The
  mock-mode smoke suite (short, `e2e/mock-mode/`) protects it; it uses no route
  mocks and fails if any request leaves the app origin. Do not duplicate the
  regression suite in mock mode.
- **Gateway smoke** (`e2e/gateway/`) runs with no app mock and no route
  response mocks against a real Kong (local-stack/staging). Observation-only
  listeners are allowed; `route.fulfill` is banned there. It is a mandatory
  pre-cutover gate, not a per-PR gate.
- **A production build with `VITE_USE_MOCK=true` must fail** — `vite.config.ts`
  enforces it and CI has a negative test. Never weaken this guard.
- Prefer role/label locators over CSS selectors and test IDs
  (`getByRole` → `getByLabel` → `getByPlaceholder` → scoped `getByText` →
  `data-testid` last).
- Network-contract assertions: mutation tests must fail if the expected request
  never fires; assert method, path shape, auth header, and call count. Never
  call `/internal` paths or add an `/api` prefix.
- UI changes require desktop and mobile coverage. High-risk changes (auth,
  cart, checkout, toast) also require visual, accessibility, error, and network
  cases — happy path alone is not acceptable.
- **No critical/serious accessibility violations** are allowed for changed flows.
- Use `agent-browser` for dogfood/exploratory validation (a11y snapshots,
  screenshots, console/network inspection). Re-snapshot after every DOM change.
  Any regression agent-browser finds must be converted into a Playwright test
  (fail first, then fix).
- Do not skip, retry-mask, or threshold-mask failing tests to keep CI green.

## Conventions

**CRITICAL — Web-layer-only.** The SPA calls **only** the platform Web-layer HTTP
endpoints:

```
{VITE_API_BASE_URL}/{service}/v1/{public|private}/{resource…}
```

- `{service}` ∈ `auth`, `user`, `product`, `cart`, `order`, `review`, `notification`, `checkout`.
- `{audience}` is `public` (anonymous) or `private` (JWT). **Never** `internal`.
- **Never** call Logic, Core, the database, gRPC, or any in-cluster service DNS directly.
- Complex operations are server-side **aggregation endpoints** — call the aggregate, do
  not orchestrate multiple calls client-side.
- Each `src/api/*.ts` module owns its own `/{service}/v1/{audience}` prefix.
  `config.ts` decides **only** the host — do not put service prefixes there.

Base URL:

- `src/api/config.ts` reads `VITE_API_BASE_URL`, defaulting to `https://gateway.duynh.me`.
  An explicit empty string means same-origin (deliberate `??` semantics).
- Use the **same path the service exposes** — Kong is pass-through, no rewriting.

Auth:

- The RS256 access token lives in `localStorage.authToken` and the rotating
  refresh token in `localStorage.authRefreshToken` (`src/auth/tokens.ts`);
  `client.ts` attaches `Authorization: Bearer <access token>` to every request.
  Read auth state via `tokens.ts` helpers (`getAccessToken`, `getStoredUser`,
  `isAuthenticated`) — never via raw `localStorage.getItem` in components.
- On `401` the client does one **silent refresh** (single-flight in-tab; Web Locks
  serialise tabs) via `POST /auth/v1/public/auth/refresh` and retries the request once.
  If refresh fails or no refresh token exists it clears the session and redirects
  to `/login` — unless the call sets `skipAuthRefresh: true` (cart/notification
  badge pollers), which **still refreshes** but skips the redirect.
- Logout: `POST /auth/v1/public/auth/logout {refresh_token}` revokes the token family
  server-side, then local state is cleared regardless of the result.
- Demo login (seeded `auth-db`): username `alice`, password `password123` — log in by
  **username**, not email.

Diagrams:

- **Mermaid only.** Never ASCII-art diagrams.

## Gotchas

- **`VITE_API_BASE_URL` is baked in at build time**, not read at runtime. Changing the
  gateway origin requires a rebuild — there is no runtime config injection in the Nginx pod.
- **No `/api` proxying inside the pod.** Nginx serves only the SPA bundle; all API calls go
  cross-origin to the gateway.
- **Never call internal or gRPC endpoints** — they are not on the gateway and are fenced by
  NetworkPolicy. Browser traffic is `public`/`private` HTTP only.
- Always use the **same path the service exposes**; do not rewrite or add `/api` prefixes.
- Vite reads env when the dev-server process starts. The Playwright configs pin
  ports (3000 regression / 3100 mock-mode) with `strictPort` and never reuse an
  existing server — stop your own `npm run dev` before running suites locally.

## Source of truth

- API naming: [`homelab/docs/api/api-naming-convention.md`](https://github.com/duynhlab/homelab/blob/main/docs/api/api-naming-convention.md)
- Endpoint shapes: [`homelab/docs/api/api.md`](https://github.com/duynhlab/homelab/blob/main/docs/api/api.md)
