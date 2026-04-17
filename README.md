# frontend

React SPA e-commerce frontend for the monitoring platform.

## Features

- Product browsing and search
- Shopping cart
- User authentication
- Order management
- Profile settings

## Tech Stack

- React 18
- Vite
- TypeScript
- TanStack Query
- React Router
- Tailwind CSS

## Development

```bash
npm install
npm run dev
```

### Environment variables

| Name | Default | Purpose |
|------|---------|---------|
| `VITE_API_BASE_URL` | `http://gateway.duynhne.me` | Kong gateway origin. Override for local dev against a port-forwarded gateway, CI, or staging. |
| `VITE_USE_MOCK` | `false` | If `true`, `productApi.getProducts()` returns in-memory mock data (no network call). Useful for UI-only work without the backend running. |

### API integration

All HTTP calls go through Kong at the origin above using **Variant A edge naming**:

```
{VITE_API_BASE_URL}/{service}/v1/{audience}/{resource...}
```

Kong rewrites each edge path to the cluster `/api/v1/*` handler; service code is unchanged. See [`AGENTS.md`](AGENTS.md) for the per-function path table, and the [homelab naming convention](https://github.com/duynhlab/homelab/blob/main/docs/api/api-naming-convention.md) for the authoritative mapping.

## Build

```bash
npm run build
```

## License

MIT
