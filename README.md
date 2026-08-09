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
| UI | React 19, plain CSS (no component library) |
| Build | Vite 8 |
| Routing | React Router 7 |
| HTTP | axios (shared client with auth interceptors) |
| Server state | SWR |
| Notifications | react-hot-toast |
| Runtime | Node 24, npm only |

## Project layout

```
frontend/
├── src/
│   ├── api/              # Axios client + one module per backend service
│   │   ├── client.js     #   interceptors (auth header, 401 silent refresh)
│   │   ├── config.js     #   gateway origin from VITE_API_BASE_URL
│   │   └── mock/         #   in-memory store when VITE_USE_MOCK=true
│   ├── auth/             # token storage, session logout
│   ├── components/       # common/, domain/, layout/
│   ├── hooks/            # useAuth, useProducts, useApiQuery, useApiMutation, useToast
│   ├── pages/            # one folder per route
│   ├── App.jsx           # routes and shell
│   └── main.jsx
├── e2e/                  # Playwright smoke tests (route mocks)
├── Dockerfile            # multi-stage build → Nginx
├── playwright.config.js
└── vite.config.js
```

Routes: `/` (home), `/products`, `/products/:id`, `/cart`, `/checkout`, `/orders`,
`/notifications`, `/profile`, `/login`.

## Development

### Prerequisites

- Node.js 24
- npm (lockfile is `package-lock.json`; CI uses `npm ci`)

### Scripts

```bash
npm install          # install dependencies
npm run dev          # Vite dev server with hot reload
npm run build        # production bundle → dist/
npm run preview      # serve the built bundle locally
npm run lint         # ESLint
npm run test:e2e     # Playwright E2E (mocked APIs, no gateway)
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

- [Shared API rules and endpoint inventory](https://github.com/duynhlab/homelab/blob/main/docs/api/api.md) — URL model, audiences, auth, errors, pagination

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

End-to-end tests live in `e2e/` and use Playwright with `page.route()` mocks — no live
gateway is required. `playwright.config.js` starts Vite via `webServer` and sets
`VITE_USE_MOCK=false` so HTTP is intercepted at the network layer rather than by the
in-app mock store.

CI runs lint, build, and E2E on every pull request (`.github/workflows/check.yml`).

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
