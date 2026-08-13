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

Open http://localhost:3000. Mock mode also fakes the Keycloak session: click
**Sign in with Keycloak** on `/login` and you are logged in as **`alice`**
(no password, no Keycloak container). Checkout promo code in mock mode:
**`save10`**.

### Option B — Local stack or gateway

To exercise the full platform (Go microservices, Temporal checkout saga, and so on),
run the [homelab local-stack](https://github.com/duynhlab/homelab/tree/main/local-stack):

```bash
docker compose up -d --build
```

Point the frontend at the gateway and Keycloak, and disable mock mode:

```bash
# .env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8080
VITE_KEYCLOAK_URL=http://localhost:8081
VITE_KEYCLOAK_REALM=duynhlab
VITE_KEYCLOAK_CLIENT_ID=customer-spa
```

Then `npm install && npm run dev`. Signing in redirects to the Keycloak login
page — log in as **`alice`** / **`password123`** by **username**, not email.

Production builds default to `https://gateway.duynh.me` when `VITE_API_BASE_URL` is
unset; the cluster image build passes `KEYCLOAK_URL=https://id.duynh.me`.

## Features

- **Product catalog** — paginated list (24 items per page) and detail pages with
  server-side review aggregation
- **Cart** — live count badge, quantity editing, server-side pricing
- **Checkout** — multi-step flow backed by the platform checkout saga; order status
  updates on the Orders page
- **Orders** — order history and status tracking
- **Notifications** — unread badge, mark-as-read, mark-all
- **Profile** — view and edit user profile
- **Authentication** — OpenID Connect via Keycloak (Authorization Code + PKCE
  S256, `keycloak-js`); silent SSO resume and token refresh are handled by the
  adapter

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19, plain CSS (no component library) |
| Build | Vite 8 |
| Routing | React Router 7 |
| HTTP | axios (shared client with auth interceptors) |
| Auth | Keycloak (`keycloak-js`, OIDC Code + PKCE S256) |
| Server state | SWR |
| Notifications | react-hot-toast |
| Runtime | Node 24, npm only |

## Project layout

```
frontend/
├── src/
│   ├── api/              # Axios client + one module per backend service
│   │   ├── client.js     #   interceptors (bearer token via keycloak-js, errors)
│   │   ├── config.js     #   gateway origin from VITE_API_BASE_URL
│   │   └── mock/         #   in-memory store when VITE_USE_MOCK=true
│   ├── auth/             # keycloak.js — keycloak-js singleton (+ mock adapter)
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
| `VITE_USE_MOCK` | `false` | When `true`, all `src/api/*` modules serve from the in-memory mock store (`src/api/mock/`) and auth uses the mock Keycloak adapter. No gateway or Keycloak required. |
| `VITE_KEYCLOAK_URL` | `http://localhost:8081` | Keycloak origin (cluster: `https://id.duynh.me`). Baked in at **build time**. |
| `VITE_KEYCLOAK_REALM` | `duynhlab` | Keycloak realm name. |
| `VITE_KEYCLOAK_CLIENT_ID` | `customer-spa` | Public OIDC client id (Code + PKCE S256, no secret). |
| `VITE_KEYCLOAK_MOCK` | `false` | Test-only: swap in the mock Keycloak adapter without enabling API mocks (used by Playwright). |

Copy [`.env.example`](.env.example) to `.env` and adjust for your setup.

## API conventions

Every HTTP call uses **Variant A** edge naming through Kong (pass-through, no path
rewriting):

```
{VITE_API_BASE_URL}/{service}/v1/{audience}/{resource…}
```

- **Services:** `user`, `product`, `cart`, `order`, `review`, `notification`,
  `shipping`, `checkout` (authentication is an OIDC redirect to Keycloak, not a
  platform service call)
- **Audience:** `public` (anonymous) or `private` (JWT). Never `internal`.
- Each `src/api/*.js` module owns its `/{service}/v1/{audience}` prefix; `config.js`
  decides only the host.
- Prefer server-side **aggregation endpoints** over orchestrating multiple calls in
  the browser.

Examples:

```
GET  /product/v1/public/products?page=1&page_size=24
GET  /product/v1/public/products/{id}/details
GET  /cart/v1/private/cart
POST /checkout/v1/private/checkout/sessions
```

Authoritative references:

- [API naming convention](https://github.com/duynhlab/homelab/blob/main/docs/api/api-naming-convention.md)
- [Endpoint inventory](https://github.com/duynhlab/homelab/blob/main/docs/api/api.md)

## Authentication

Authentication is delegated to **Keycloak** (realm `duynhlab`, public client
`customer-spa`) using OpenID Connect **Authorization Code + PKCE S256** via the
`keycloak-js` adapter (`src/auth/keycloak.js`).

- **Login** — `/login` shows a single button that redirects to the Keycloak
  login page (Direct Access Grants are disabled — there is no in-app password
  form; self-registration is off in this release).
- **Tokens** — managed **in memory** by keycloak-js (15-minute access tokens).
  Nothing auth-related is written to localStorage; SSO session continuity comes
  from the Keycloak cookie, resumed silently at startup (`check-sso` +
  `public/silent-check-sso.html`).
- **Request flow** — `client.js` awaits `keycloak.updateToken(30)` before each
  request and attaches `Authorization: Bearer <token>`. If refresh fails, the
  app redirects to the Keycloak login page.
- **Badge pollers** — cart and notification count requests set
  `skipAuthRefresh: true` so a failed refresh never redirects mid-session.
- **User identity** — read from token claims: `sub` (opaque string user id),
  `preferred_username`, `email`.
- **Logout** — `keycloak.logout({ redirectUri: origin })` ends the SSO session
  and returns to the app.
- **Demo account** — username `alice`, password `password123` (seeded in the
  Keycloak realm). Log in by **username**, not email.

## Testing

End-to-end tests live in `e2e/` and use Playwright with `page.route()` mocks — no live
gateway is required. `playwright.config.js` starts Vite via `webServer` and sets
`VITE_USE_MOCK=false` so HTTP is intercepted at the network layer rather than by the
in-app mock store.

Auth in E2E defaults to the **mock Keycloak adapter** (`VITE_KEYCLOAK_MOCK=true`),
so no Keycloak container is needed. Run with `E2E_REAL_KEYCLOAK=1` to drive the
real Keycloak login form at `VITE_KEYCLOAK_URL` (e.g. the local-stack container
on `http://localhost:8081`).

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
