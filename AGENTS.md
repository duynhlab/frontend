# frontend

> AI Agent context for understanding this repository

## 📋 Overview

E-commerce frontend application built with React and Vite. Provides the user interface for browsing products, managing cart, and processing orders.

## 🏗️ Architecture

```
frontend/
├── src/
│   ├── api/              # API client (axios)
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── context/          # React Context providers
│   └── App.jsx           # Main app component
├── index.html
├── vite.config.js
├── package.json
├── Dockerfile
└── nginx.conf
```

## 🔧 Tech Stack

| Component | Technology |
|-----------|------------|
| **Framework** | React 18 |
| **Build Tool** | Vite 6 |
| **Routing** | React Router v6 |
| **HTTP Client** | Axios |
| **Data Fetching** | SWR |
| **Linting** | ESLint |

## 📦 Dependencies

- `react` / `react-dom` - UI library
- `react-router-dom` - Client-side routing
- `axios` - HTTP client
- `swr` - Data fetching/caching

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Development

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=https://gateway.duynh.me
```

Each `src/api/*.js` module owns its `/{service}/v1/{audience}` prefix — `VITE_API_BASE_URL` is just the gateway origin.

### Docker Build

```bash
docker build -t frontend .
docker run -p 80:80 frontend
```

## 🚀 CI/CD

Uses reusable GitHub Actions from [shared-workflows](https://github.com/duyhenryer/shared-workflows):

- **docker-build.yml** - Build and push to GHCR

## 📐 Code Patterns

- **Functional components** with hooks
- **SWR** for server state management
- **Axios interceptors** for auth token handling
- **React Context** for global state (auth, cart)

## 🔗 Backend Services

Communicates with:
- `auth-service` - Login/Register
- `user-service` - User profile
- `product-service` - Product catalog
- `cart-service` - Shopping cart
- `order-service` - Order processing
- `review-service` - Product reviews
- `notification-service` - User notifications
- `shipping-service` - Track & estimate

## 🌐 API Integration

The frontend calls the backend through a single Kong gateway using **Variant A edge naming**:

```
https://gateway.duynh.me/{service}/v1/{audience}/{resource...}
```

- `{service}` — one of the 8 services listed above.
- `{audience}` — `public` (anonymous) or `private` (JWT). Never `internal`.
- Services mount these exact paths on their HTTP routers (Variant A — no rewriting). Kong is pure pass-through.

**Base URL** — `src/api/config.js` reads `VITE_API_BASE_URL`; defaults to `http://gateway.duynh.me`. Every `src/api/*.js` module owns its own `/{service}/v1/{audience}` prefix (do NOT set the prefix in `config.js` — the module is where the audience decision lives).

**Examples:**

| Function | Edge path (what the browser sends) | Audience |
|----------|------------------------------------|----------|
| `login(username, password)` | `POST /auth/v1/public/login` | public |
| `getProducts()` | `GET /product/v1/public/products` | public |
| `getCart()` | `GET /cart/v1/private/cart` | private |
| `createOrder(data)` | `POST /order/v1/private/orders` | private |
| `getNotifications()` | `GET /notification/v1/private/notifications` | private |

**Auth header** — `client.js` reads `localStorage.authToken` and sends `Authorization: Bearer <token>` on every request. On a 401 it clears the token and redirects to `/login` (unless the call opts out via `skipAuthRefresh: true` — used by the badge pollers for cart count and notification count so a transient 401 does not log the user out).

**CORS** — `duynh.me` hits `gateway.duynh.me` cross-origin. Kong's `cors-policy` `KongClusterPlugin` allows `http(s)://duynh.me` with `credentials: true` and permits the `Authorization` header.

**Convention source of truth:** [`homelab/docs/api/api-naming-convention.md`](https://github.com/duynhlab/homelab/blob/main/docs/api/api-naming-convention.md). The Nginx static container serves only the SPA bundle; all API calls go cross-origin to `gateway.duynh.me` — no `/api` proxying inside the frontend pod.
