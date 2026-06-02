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
- CI on PRs runs `npm ci && npm run lint && npm run build` (`.github/workflows/check.yml`).
  Keep it green.

## Code quality

- **Functional components + hooks only.** No class components.
- One component per file; co-locate `.css` next to its `.jsx`.
- Keep components small; lift shared logic into `src/hooks/` and shared UI into
  `src/components/common/`.
- **Server state via SWR** (`src/hooks/useApiQuery.js`, `useApiMutation.js`) — do not
  hand-roll fetch-in-effect for data the API owns.
- **Never commit secrets or tokens.** The only runtime config is `VITE_*` env vars.
- **Accessible markup**: semantic elements, `alt` on images, labels on inputs,
  keyboard-reachable controls.
- **Lint clean**: `npm run lint` must pass. Prefix intentionally-unused vars with `_`.
  `prop-types` validation is disabled — do not add `propTypes`.

## Project overview

`frontend` is the **React SPA** for the `duynhlab` e-commerce platform: browse products,
manage the cart, check out, view orders, profile, and notifications. It is a static
bundle (built by Vite, served by Nginx) that talks to the platform **only** over HTTP
through the Kong gateway.

## Repository layout

```
frontend/
├── src/
│   ├── api/            # Axios client + one module per backend service
│   │   ├── client.js   #   shared axios instance, interceptors (auth, 401)
│   │   ├── config.js   #   gateway origin from VITE_API_BASE_URL
│   │   ├── authApi.js  #   login/register/me/logout
│   │   ├── cartApi.js  productApi.js  orderApi.js  reviewApi.js
│   │   ├── userApi.js  notificationApi.js  shippingApi.js
│   │   └── mockData.js #   mock fixtures (VITE_USE_MOCK=true)
│   ├── auth/           # session.js — logout / token clearing
│   ├── components/
│   │   ├── common/     #   reusable UI (toasts, skeletons, pagination, errors)
│   │   ├── domain/     #   product cards, grid, filter, quantity selector
│   │   ├── layout/     #   Header
│   │   └── ProtectedRoute.jsx
│   ├── hooks/          # useAuth, useProducts, useApiQuery, useApiMutation
│   ├── pages/          # one folder per route (Home, ProductList, ProductDetail,
│   │                   #   Cart, Checkout, Orders, Profile, Notification, Login)
│   ├── utils/          # errorMessages.js
│   ├── App.jsx         # routes
│   └── main.jsx        # entry
├── index.html
├── vite.config.js
├── Dockerfile          # multi-stage build → Nginx static serve
├── nginx.conf
└── package.json
```

## Build, test, lint

Node 24, **npm only** (`package-lock.json`; CI uses `npm ci`).

```bash
npm install        # install deps
npm run dev        # Vite dev server, hot reload
npm run build      # production bundle → dist/
npm run preview    # serve the built bundle locally
npm run lint       # ESLint
```

- **There is no test script.** Do not invent `npm test` / `npm run test`.
- Docker: `docker build -t frontend .` then `docker run -p 80:80 frontend`.

## Conventions

**CRITICAL — Web-layer-only.** The SPA calls **only** the platform Web-layer HTTP
endpoints:

```
{VITE_API_BASE_URL}/{service}/v1/{public|private}/{resource…}
```

- `{service}` ∈ `auth`, `user`, `product`, `cart`, `order`, `review`, `notification`, `shipping`.
- `{audience}` is `public` (anonymous) or `private` (JWT). **Never** `internal`.
- **Never** call Logic, Core, the database, gRPC, or any in-cluster service DNS directly.
- Complex operations are server-side **aggregation endpoints** — call the aggregate, do
  not orchestrate multiple calls client-side.
- Each `src/api/*.js` module owns its own `/{service}/v1/{audience}` prefix.
  `config.js` decides **only** the host — do not put service prefixes there.

Base URL:

- `src/api/config.js` reads `VITE_API_BASE_URL`, defaulting to `https://gateway.duynh.me`.
- Use the **same path the service exposes** — Kong is pass-through, no rewriting.

Auth:

- Token lives in `localStorage.authToken`; `client.js` attaches
  `Authorization: Bearer <token>` to every request.
- On `401` the client clears the token and redirects to `/login`, unless the call sets
  `skipAuthRefresh: true` (used by cart-count and notification-count pollers so a transient
  401 does not log the user out).
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

## Source of truth

- API naming: [`homelab/docs/api/api-naming-convention.md`](https://github.com/duynhlab/homelab/blob/main/docs/api/api-naming-convention.md)
- Endpoint shapes: [`homelab/docs/api/api.md`](https://github.com/duynhlab/homelab/blob/main/docs/api/api.md)
