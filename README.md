# DuynhLab Frontend

React single-page application for the [duynhlab](https://github.com/duynhlab) e-commerce
platform. The app is a static Vite bundle served by Nginx in production. All backend
communication goes through the Kong gateway over HTTP using the platform's Web-layer
endpoints only.

## Quick start

### Option A — Mock mode (no gateway)

Best for UI work offline. Copy the example env, enable mock mode, and start the dev
server:

```bash
cp .env.example .env
# Set VITE_USE_MOCK=true in .env
npm install
npm run dev
```

Open http://localhost:3000. Log in with username **`alice`** /
password **`password123`**. Checkout promo code in mock mode: **`save10`**.

### Option B — Local stack or gateway

To exercise the full platform (Go microservices, Temporal checkout saga, and so on),
run the [homelab local-stack](https://github.com/duynhlab/homelab/tree/main/local-stack):

```bash
docker compose up -d --build
```

Point the frontend at the gateway and disable mock mode:

```bash
# .env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8080
```

Then `npm install && npm run dev`. Log in as **`alice`** / **`password123`** by
**username**, not email.

Production builds default to `https://gateway.duynh.me` when `VITE_API_BASE_URL` is
unset.

## Features

- **Product catalog** — paginated list (24 items per page) and detail pages with
  server-side review aggregation
- **Cart** — live count badge, quantity editing, server-side pricing
- **Checkout** — multi-step flow backed by the platform checkout saga; order status
  updates on the Orders page
- **Orders** — order history and status tracking
- **Notifications** — unread badge, mark-as-read, mark-all
- **Profile** — view and edit user profile
- **Authentication** — login/register with RS256 JWTs and silent token refresh

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui (Base UI foundation), Lucide React |
| Forms | React Hook Form + Zod (business forms and the auth/checkout API boundaries) |
| Notifications | shadcn Toast behind `src/lib/notifications.ts` (single `<Toaster />`) |
| Build | Vite 8 (`npm run build` typechecks first) |
| Routing | React Router 7 (declarative SPA mode) |
| HTTP | axios (shared client with auth interceptors) |
| Server state | SWR |
| E2E | Playwright (regression gate) + agent-browser (dogfood) |
| Runtime | Node 24, npm only |
| Production | static bundle served by Nginx; API via Kong |

## Project layout

```
frontend/
├── src/
│   ├── api/                # Axios client + one module per backend service
│   │   ├── client.ts       #   interceptors (auth header, 401 silent refresh)
│   │   ├── config.ts       #   gateway origin from VITE_API_BASE_URL
│   │   ├── types/          #   request/response DTOs per service
│   │   ├── schemas/        #   Zod schemas (auth + checkout boundaries only)
│   │   └── mock/           #   in-memory store when VITE_USE_MOCK=true
│   ├── auth/               # token storage (tokens.ts), session logout
│   ├── components/
│   │   ├── ui/             #   shadcn primitives (Base UI) — no business logic
│   │   ├── common/         #   ConfirmAction, EmptyState, AppError, AppPagination, …
│   │   └── layout/         #   AppLayout, AppHeader, MobileNavigation (Sheet)
│   ├── features/           # business UI: auth/, products/, cart/, checkout/
│   ├── hooks/              # useAuth, useProducts, useApiQuery, useApiMutation
│   ├── lib/                # notifications.ts, errors.ts, forms.ts, format.ts, utils.ts
│   ├── pages/              # route-level screens (compose only)
│   ├── App.tsx             # routes
│   └── main.tsx
├── e2e/                    # Playwright: smoke/, regression/, mock-mode/, gateway/
├── scripts/agent-browser/  # dogfood orchestration (smoke / a11y / visual)
├── components.json         # shadcn foundation lock — do not hand-edit
├── playwright.config.ts    # + playwright.mock-mode.config.ts, playwright.gateway.config.ts
├── Dockerfile              # multi-stage build → Nginx
└── vite.config.ts          # refuses production builds with VITE_USE_MOCK=true
```

Routes: `/` (home), `/products`, `/products/:id`, `/cart`, `/checkout`, `/orders`,
`/notifications`, `/profile`, `/login`.

## Development

### Prerequisites

- Node.js 24+
- npm (lockfile is `package-lock.json`; CI uses `npm ci`)

### Scripts

```bash
npm install          # install dependencies
npm run dev          # Vite dev server with hot reload
npm run build        # production bundle → dist/
npm run preview      # serve the built bundle locally
npm run lint         # ESLint (src + e2e + configs)
npm run typecheck    # tsc, all projects (src, node configs, e2e)
npm run test:e2e     # Playwright regression (app mock OFF, route mocks ON)
npm run test:e2e:mock-mode  # mock-mode smoke (app mock ON, no route mocks)
npm run test:e2e:gateway    # gateway smoke (no mocks; needs E2E_BASE_URL + E2E_GATEWAY_URL)
npm run test:agent:cutover  # agent-browser dogfood (smoke + a11y + visual)
npm run test:e2e:ui  # Playwright UI mode
npm run test:e2e:headed
npm run test:e2e:report
```

First-time E2E setup:

```bash
npx playwright install chromium
```

### Environment variables

| Name | Default | Purpose |
|------|---------|---------|
| `VITE_API_BASE_URL` | `https://gateway.duynh.me` | Kong gateway origin. Use `http://localhost:8080` for local-stack. Baked in at **build time** — changing it requires a rebuild. |
| `VITE_USE_MOCK` | `false` | When `true`, all `src/api/*` modules serve from the in-memory mock store (`src/api/mock/`). No gateway required. |

Copy [`.env.example`](.env.example) to `.env` and adjust for your setup.

## API conventions

Every HTTP call uses **Variant A** edge naming through Kong (pass-through, no path
rewriting):

```
{VITE_API_BASE_URL}/{service}/v1/{audience}/{resource…}
```

- **Services:** `auth`, `user`, `product`, `cart`, `order`, `review`, `notification`,
  `shipping`, `checkout`
- **Audience:** `public` (anonymous) or `private` (JWT). Never `internal`.
- Each `src/api/*.js` module owns its `/{service}/v1/{audience}` prefix; `config.js`
  decides only the host.
- Prefer server-side **aggregation endpoints** over orchestrating multiple calls in
  the browser.

Examples:

```
POST /auth/v1/public/auth/login
GET  /product/v1/public/products?page=1&page_size=24
GET  /product/v1/public/products/{id}/details
POST /checkout/v1/private/checkout/sessions
```

Authoritative references:

- [API naming convention](https://github.com/duynhlab/homelab/blob/main/docs/api/api-naming-convention.md)
- [Endpoint inventory](https://github.com/duynhlab/homelab/blob/main/docs/api/api.md)

## Authentication

- **Access token** — RS256 JWT in `localStorage.authToken`
- **Refresh token** — rotating pair in `localStorage.authRefreshToken`
- **Request flow** — `client.js` attaches `Authorization: Bearer <access>` on every
  request
- **Silent refresh** — on `401`, one refresh call fires (single-flight per tab; Web
  Locks serialise across tabs) via `POST /auth/v1/public/auth/refresh`, then the
  original request retries once. If refresh fails, the session clears and the app
  redirects to `/login`.
- **Badge pollers** — cart and notification count requests set `skipAuthRefresh: true`
  so a failed refresh does not redirect mid-session; they still attempt refresh.
- **Logout** — `POST /auth/v1/public/auth/logout` with `{ refresh_token }` revokes the
  token family server-side; local state clears regardless of the response.
- **Demo account** — username `alice`, password `password123` (seeded in platform
  auth-db). Log in by **username**, not email.

## Testing

Three Playwright suites with strictly separated mock policies (see `AGENTS.md`):

| Suite | Command | App mock | Route mocks | Purpose |
|---|---|---|---|---|
| Regression (`e2e/smoke`, `e2e/regression`) | `npm run test:e2e` | OFF | ON | Deterministic merge gate: axios, interceptors, auth refresh and Kong path shapes are really exercised and asserted (network contract fails a test whose expected request never fires) |
| Mock-mode smoke (`e2e/mock-mode`) | `npm run test:e2e:mock-mode` | ON | none | Protects local/offline development; fails on any request leaving the app origin |
| Gateway smoke (`e2e/gateway`) | `npm run test:e2e:gateway` | OFF | none | Real Kong integration (CORS, paths, auth, checkout). Mandatory before a production cutover; dispatch-only workflow until an environment is available |

Notes:

- The regression server runs on port 3000 and the mock-mode server on port 3100, both
  with `--strictPort` and no server reuse — stop your own `npm run dev` before running
  suites locally (Vite reads env at process start; a stale server silently lies).
- Visual snapshots under `e2e/__screenshots__/` are CI-Linux-canonical; update them via
  CI or the Playwright Docker image, never from macOS.
- `agent-browser` powers exploratory dogfooding (`npm run test:agent:*`): accessibility
  audits gate on zero critical/serious violations, journeys fail on console/runtime
  errors, and artifacts land in `dogfood-output/` (untracked except the cutover
  report). It needs the app already running (mock mode recommended) and never uses
  production credentials. Regressions it finds must be converted into Playwright tests.
- A production build with `VITE_USE_MOCK=true` fails by design, and CI verifies both
  that refusal and that the mock store never reaches production assets.

CI runs lint, typecheck, build + migration guards, the regression suite, and the
mock-mode smoke on every pull request (`.github/workflows/check.yml`); the gateway
smoke has its own dispatch workflow (`gateway-smoke.yml`).

## Docker

```bash
docker build -t frontend .
docker run -p 80:80 frontend
```

The image is a multi-stage build: Vite produces `dist/`, Nginx serves the static
bundle. API calls from the browser are cross-origin to the gateway — the Nginx pod does
not proxy `/api`.

## Deployment notes

- **`VITE_*` variables are baked in at build time.** There is no runtime config
  injection in the Nginx pod. Rebuild and redeploy to change the gateway origin.
- **No in-pod API proxy.** The SPA and Kong are separate origins in production.
- **Web-layer only.** Never call Logic, Core, gRPC, or in-cluster service DNS from the
  browser. Internal endpoints are not exposed on the gateway.

## Contributing

Work on a feature branch, open a pull request against `main`, and squash-merge when CI
is green. Agent and contributor conventions (commit format, code quality, repository
layout) are documented in [`AGENTS.md`](AGENTS.md).

## License

MIT
