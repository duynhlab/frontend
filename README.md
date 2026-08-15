# DuynhLab Frontend

The customer storefront for the [duynhlab](https://github.com/duynhlab) platform:
a React single-page application, built by Vite and served by Nginx in production.
Every screen reads from the live Go microservices through the Envoy Gateway edge.

The operator Backoffice is a separate app (`admin-service`). Both share one stack
by design — see homelab RFC-0025 and ADR-052.

## Quick start

There is no offline mode: the app has no mock data and no mock login. Bring the
platform up first.

```bash
# 1. Start the stack (Postgres, the services, Keycloak, the gateway)
cd ../homelab/local-stack && docker compose up -d --build

# 2. Run the storefront
cd ../../frontend
npm install
npm run dev
```

Open <http://localhost:3000> and sign in with **`alice` / `password123`** — by
**username**, not email. `bob`, `carol`, `david` and `eve` exist too, with the
same password; `bob` and `eve` are the ones to use if you want to see the
first-time states. Self-registration is disabled on the realm, so there is no
sign-up page.

`.env.development` already points at the local stack (`:8080` for the gateway,
`:8081` for Keycloak) and Vite loads it only for `npm run dev`.

## Features

- **Catalog** — one storefront at `/`, with search, category filtering and paging
  all held in the URL, so a filtered view is a link you can share
- **Product detail** — one aggregation call returns the product, live inventory
  availability, reviews and related products
- **Cart** — server-owned, with a header badge that keeps up with a cart edited
  in another tab
- **Checkout** — the four-step session funnel behind the platform's checkout saga,
  with promo codes, re-quoting and idempotent order placement
- **Orders** — history and a detail view carrying shipment, payment and fulfilment
- **Notifications** — unread badge, mark one, mark all
- **Profile** — view and edit
- **Authentication** — OpenID Connect via Keycloak (Authorization Code + PKCE
  S256); silent SSO resume and token refresh are handled by the adapter
- **Light and dark themes**, following the OS unless you choose

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19, Tailwind CSS v4, shadcn (`base-nova`) on Base UI |
| Language | TypeScript, strict |
| Build | Vite 8 |
| Routing | TanStack Router (file-based, code-split) |
| Server state | TanStack Query |
| Forms | TanStack Form + Zod |
| HTTP | `fetch`, wrapped in `src/lib/api.ts` |
| Auth | Keycloak (`keycloak-js`, OIDC Code + PKCE S256) |
| Icons | lucide-react |
| Lint | oxlint |
| E2E | Playwright + axe-core |
| Runtime | Node 24, npm only |

## Project layout

```
frontend/
├── src/
│   ├── lib/              # api.ts, auth.ts, query.ts, error-copy.ts,
│   │                     #   format.ts, theme.ts, utils.ts
│   ├── features/         # catalog, cart, checkout, orders, notifications, profile
│   │                     #   each: api.ts (+ queries.ts)
│   ├── components/
│   │   ├── ui/           #   shadcn primitives
│   │   └── app-shell, states, pagination, product-tile, star-rating,
│   │       status-chip, route-fallbacks
│   ├── hooks/            # use-auth, use-theme
│   ├── routes/           # file-based routes
│   ├── index.css         # theme tokens (oklch, :root + .dark)
│   └── main.tsx
├── tests/                # Playwright, against the real stack
├── Dockerfile            # multi-stage build → Nginx
├── playwright.config.ts
└── vite.config.ts
```

Routes: `/` (the catalog), `/products/:id`, `/cart`, `/checkout`, `/orders`,
`/orders/:id`, `/notifications`, `/profile`, `/login`. `/products` redirects to
`/` for old links.

## Development

### Prerequisites

- Node.js 24 (`.nvmrc`)
- npm (lockfile is `package-lock.json`; CI uses `npm ci`)
- The homelab local-stack running, for anything beyond the catalog

### Scripts

```bash
npm install          # install dependencies
npm run dev          # Vite dev server on :3000 with hot reload
npm run build        # tsc -b && vite build → dist/
npm run preview      # serve the built bundle locally
npm run lint         # oxlint --deny-warnings
npm run test:e2e     # Playwright — needs the live stack
npm run test:e2e:ui  # Playwright UI mode
```

First-time E2E setup:

```bash
npx playwright install chromium
```

### Environment variables

Every `VITE_*` value is baked in at **build time**. There is no runtime config
injection in the Nginx pod, so changing an origin means rebuilding.

| Name | Default | Purpose |
|------|---------|---------|
| `VITE_API_BASE_URL` | `https://gateway.duynh.me` | Gateway origin. `http://localhost:8080` for local-stack. |
| `VITE_KEYCLOAK_URL` | `http://localhost:8081` | Keycloak origin (cluster: `https://id.duynh.me`). |
| `VITE_KEYCLOAK_REALM` | `duynhlab` | Realm name. |
| `VITE_KEYCLOAK_CLIENT_ID` | `customer-spa` | Public OIDC client id (Code + PKCE S256, no secret). |

`.env` carries the cloud baseline for a plain `npm run build`; `.env.development`
overrides it for `vite dev` only, so nothing local can reach a released image.
The image itself takes its values from Docker build args.

## API conventions

Every call uses **Variant A** edge naming (the gateway is pass-through — the path
this app sends is the path the service receives):

```
{VITE_API_BASE_URL}/{service}/v1/{audience}/{resource…}
```

- **Services:** `user`, `product`, `cart`, `order`, `review`, `notification`,
  `shipping`, `checkout`. Authentication is an OIDC redirect, not a service call.
- **Audience:** `public` (anonymous) or `private` (JWT). Never `internal`, and
  never `protected` — that one belongs to the Backoffice.
- Each `src/features/*/api.ts` owns its prefix; `src/lib/api.ts` owns only the origin.
- Prefer server-side **aggregation endpoints** over orchestrating calls in the browser.

Examples:

```
GET  /product/v1/public/products?page=1&limit=24
GET  /product/v1/public/products/{id}/details
GET  /cart/v1/private/cart
POST /checkout/v1/private/checkout/sessions
```

Two contract details worth knowing before you write a call:

- `product-service` takes **`limit`**, not `page_size`, for its page size — and
  echoes the effective value back as `page_size`.
- The cart's writes acknowledge with `{"message": "..."}`; they do **not** return
  the cart. Re-read it.

Authoritative references:

- [API naming convention](https://github.com/duynhlab/homelab/blob/main/docs/api/api-naming-convention.md)
- [Endpoint inventory](https://github.com/duynhlab/homelab/blob/main/docs/api/api.md)

## Authentication

Delegated to **Keycloak** (realm `duynhlab`, public client `customer-spa`) using
OpenID Connect **Authorization Code + PKCE S256** through `keycloak-js`
(`src/lib/auth.ts`).

- **Login** — `/login` hands off to the Keycloak page. Direct Access Grants are
  disabled, so there can be no in-app password form; realm registration is off,
  so there is no sign-up page. Neither is a gap in this app.
- **Tokens** — held **in memory** by keycloak-js (15-minute access tokens).
  Nothing auth-related is written to web storage. SSO continuity comes from the
  Keycloak cookie, resumed silently at startup (`check-sso` +
  `public/silent-check-sso.html`).
- **Request flow** — `apiFetch` refreshes the token before every call and attaches
  `Authorization: Bearer <token>`. A failed refresh redirects to Keycloak.
- **Badge polls** — the cart and bell counts are background calls: a dead session
  fails them quietly rather than yanking you to the login page mid-browse.
- **Identity** — from token claims: `sub` (an opaque string), `preferred_username`,
  `email`.
- **Redirect safety** — `?redirect=` on `/login` is attacker-influenceable, so it
  is restricted to same-origin absolute paths.

## Testing

`tests/` holds a Playwright suite that drives the **real stack** — real Keycloak,
the real edge, real services. There are no request mocks, deliberately: a suite
that passes against fixtures says nothing about whether the shop works. It places
a real order.

Each spec establishes its own starting state rather than inheriting the previous
one's, because they share one demo account. Every screen is also scanned with
axe-core; serious and critical violations fail the run.

CI runs **lint and build only** — it has no stack to test against. The E2E suite
runs as part of the homelab local-stack release audit, which is the gate that
blocks a release tag.

## Docker

```bash
docker build -t frontend .
docker run -p 80:80 frontend
```

Multi-stage: Vite produces `dist/`, Nginx serves it with an SPA fallback so deep
links like `/orders/14` resolve. Browser API calls go cross-origin to the
gateway; the Nginx pod proxies nothing.

## Deployment notes

- **`VITE_*` variables are baked in at build time.** Rebuild and redeploy to change
  an origin.
- **No in-pod API proxy.** The SPA and the gateway are separate origins.
- **Web-layer only.** Never call Logic, Core, gRPC, or in-cluster service DNS from
  the browser — those are not exposed at the edge and are fenced by NetworkPolicy.

## Contributing

Work on a feature branch, open a pull request against `main`, and squash-merge when
CI is green. Conventions — commit format, code quality, the rules that are
load-bearing rather than stylistic — are in [`AGENTS.md`](AGENTS.md).

## License

MIT
