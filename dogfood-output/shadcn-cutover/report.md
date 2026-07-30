# shadcn/ui Cutover — Dogfood Report

Branch: `refactor/shadcn-ui-cutover`. Artifacts in sibling directories are
untracked (see `.gitignore`); only this report is committed.

## Baseline (`before/`, captured 2026-07-30, pre-migration `main` @ eb6fbca)

Environment: macOS local, Node v26.5.0, npm 11.17.0, agent-browser 0.33.1
(npm devDependency), Chromium via Playwright 1.61.1, app in mock mode
(`VITE_USE_MOCK=true`, Vite dev server, port 3000).

### Quality baseline

| Gate | Result |
|---|---|
| `npm run lint` | pass — 0 errors, 7 warnings (deliberately downgraded react-hooks rules) |
| `npm run build` | pass — 542 ms |
| `npm run test:e2e` | 8/8 pass (7 tests + auth setup), 4.7 s, chromium + chromium-authenticated |

### Bundle baseline (production, mock off)

| Asset | Size | Gzip |
|---|---|---|
| `index-*.js` (main) | 317.90 kB | 105.83 kB |
| Largest route chunk (`CheckoutFlowPage`) | 12.57 kB | 3.97 kB |
| CSS total (8 files) | ~40 kB raw | — |
| `dist/` total | 460 kB | — |

### agent-browser smoke (`before/smoke/`)

- Journeys guest / customer / checkout-entry: runtime clean — no uncaught
  errors, no console errors, no React warnings, no forbidden-path requests.
- Web Vitals JSON captured for `/`, `/products`, `/products/prod-00001`,
  `/cart`, `/checkout` (`before/smoke/vitals/`).

### agent-browser a11y (`before/a11y/`, axe 4.12.1, wcag2a+wcag2aa, gate OFF for baseline)

Known violations of the legacy UI (expected to be fixed by the migration —
the after-run gate requires 0 critical/serious):

| Route | Critical/serious |
|---|---|
| All routes | 1 × serious `color-contrast` (muted text `#777` on dark surfaces) |
| `/login` | + 1 × critical `label` (username/password inputs not programmatically labelled) |
| `/products/:id` | + 1 × critical `label` (review form fields) |

### agent-browser visual (`before/visual/`)

Full-page screenshots for 9 routes × 3 viewports (1440×900, 390×844,
360×800) + annotated desktop shots (login, products, cart, checkout).

## Intended-diff register (approved before implementation)

These will show up in every after/diff comparison and are deliberate:

1. Base typography 13 px → Tailwind default 16 px; unused Google-Fonts Inter
   link removed (user-approved).
2. Muted foreground `#777` → ≥`#8b8b8b` for AA contrast.
3. OrdersPage empty state gains its "Start Shopping" link (EmptyState
   previously dropped children).
4. Unknown routes render a real 404 page instead of silently redirecting home.
5. Cart remove / checkout cancel now require confirmation (AlertDialog).
6. shadcn design language: radii, spacing, component chrome.

## Gaps

- **Gateway smoke has NOT run** — no local-stack/staging Kong environment was
  available during the migration window (user-confirmed). The suite and
  workflow exist (`e2e/gateway/`, `gateway-smoke.yml`); running it against a
  real Kong is a mandatory gate before production cutover.

## After capture

_To be filled in phase D8._
