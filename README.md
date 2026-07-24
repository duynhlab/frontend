# frontend

The face of the duynhlab shop: a React single-page app where you browse the
catalog, fill a cart, check out, and watch your order get fulfilled. It talks
to the platform's nine Go microservices through one door — the Kong gateway —
and exists as much to exercise the platform end to end as to sell imaginary
keyboards.

Try it in two minutes with the platform's
[local-stack](https://github.com/duynhlab/homelab/tree/main/local-stack):
`docker compose up -d --build`, open http://localhost:3001, and log in as
`alice` / `password123` (by **username**, not email).

## What it does

- **Browse & search** the product catalog, with per-product detail pages that
  aggregate reviews server-side
- **Cart** with live count badge, quantity editing, and server-side pricing
- **Checkout** that kicks off the real order-fulfillment saga (Temporal) —
  place an order, then watch it move to `confirmed` on the Orders page
- **Login/register** with RS256 JWTs: the access token lives in
  localStorage, and an axios interceptor does **silent refresh** — when a
  request 401s, exactly one refresh call fires (concurrent 401s share it) and
  the original requests retry, so you never get bounced to the login page
  mid-session
- **Notifications** bell with unread badge, mark-as-read, mark-all
- **Profile** viewing and editing

## Pages

`HomePage` · `ProductListPage` · `ProductDetailPage` · `CartPage` ·
`CheckoutPage` · `OrdersPage` · `NotificationPage` · `ProfilePage` ·
`LoginPage` — routed with React Router, one API module per service under
`src/api/`.

## Tech

React 19 · Vite · JavaScript (JSX) · axios (shared client with the
silent-refresh interceptor) · SWR for data fetching · React Router 7.
Plain CSS — no UI framework.

## Development

```bash
npm install
npm run dev        # dev server against VITE_API_BASE_URL
npm run build      # production build (dist/)
npm run lint
```

### Environment variables

| Name | Default | Purpose |
|------|---------|---------|
| `VITE_API_BASE_URL` | `https://gateway.duynh.me` | Kong gateway origin. Point it at `http://localhost:8080` for local-stack, or a port-forwarded gateway. |
| `VITE_USE_MOCK` | `false` | If `true`, all `src/api/*` modules serve from the in-memory mock store (no gateway). Login: `alice` / `password123`. Promo code: `save10`. |

### How API calls are shaped

Every HTTP call goes through Kong at the origin above using the platform's
**Variant A** naming:

```
{VITE_API_BASE_URL}/{service}/v1/{audience}/{collection}/{resource...}
```

e.g. `POST /auth/v1/public/auth/login`, `GET /product/v1/public/products`,
`POST /checkout/v1/private/sessions`. Kong is pure pass-through (no
rewriting); services mount these exact paths. The per-function path table is
in [`AGENTS.md`](AGENTS.md), and the authoritative route inventory lives in
the [homelab naming convention](https://github.com/duynhlab/homelab/blob/main/docs/api/api-naming-convention.md).

## License

MIT
