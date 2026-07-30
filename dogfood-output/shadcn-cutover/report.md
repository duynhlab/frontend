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

## After capture (`after/`, captured 2026-07-30, post-migration)

Same environment as the baseline (mock-mode dev server, agent-browser 0.33.1).

### Quality gates (all green)

| Gate | Result |
|---|---|
| `npm ci` + `npm run lint` | pass — 0 errors (advisory react-hooks warnings only, deliberately downgraded pre-migration) |
| `npm run typecheck` | pass — strict, 3 projects (app / node configs / e2e) |
| `npm run build` + `scripts/ci/migration-guards.sh` | pass — all 5 guards |
| `VITE_USE_MOCK=true` production build | **refused** (negative test) |
| `npm run test:e2e` | 74 passed, 1 skipped-by-design (desktop has no hamburger) — desktop + mobile + visual projects |
| `npm run test:e2e:mock-mode` | 3 passed — zero external requests, zero runtime errors |
| `find src e2e -name '*.js(x)'` | 0 files |
| react-hot-toast imports / `npm ls` / lockfile | 0 / empty / 0 |
| `any` / `@ts-ignore` / `@ts-expect-error` | 0 |
| Legacy CSS | only `src/index.css` remains (tokens + base); page CSS deleted |

### agent-browser after-run

- Smoke journeys (guest / customer / checkout-entry): runtime clean.
- **a11y with the gate ON: clean — 0 critical/serious on all 9 routes.**
  The baseline had a serious `color-contrast` on every route plus critical
  `label` violations on login and the review form; fixed by real token work
  (primary `#6366f1`→`#818cf8` + dark foreground, destructive → `#f87171`,
  info → `#60a5fa`, muted `#777`→`#9ca3af`, no opacity-dimming of muted text)
  and programmatically labelled forms.
- Visual set captured for 9 routes × 3 viewports + annotated key screens.

### Bundle delta (production build)

| Metric | Before | After |
|---|---|---|
| Main JS (gzip) | 317.9 kB (105.8 kB) | split: 202.0 kB (64.2 kB) entry + 91.1 kB (31.3 kB) UI-primitives chunk + per-route chunks; 776 kB raw JS total |
| CSS | ~40 kB across 8 files | 68 kB (12.5 kB gzip) single file (Tailwind + shadcn) |
| Fonts | Google Fonts request (never applied) | 84 kB self-hosted Geist woff2 (no external request) |
| `dist/` total | 460 kB | 936 kB |

The increase is the design system + self-hosted font; entry gzip JS is
comparable (105.8 kB → 95.5 kB across entry+UI chunk).

### Web Vitals (mock dev server, relative signal only)

Home: FCP 160→212 ms, LCP 452→520 ms, CLS 0.02→0.04. Products: FCP 76→104 ms,
LCP 600→640 ms, CLS 0.00→0.02. Small, consistent with a richer component
layer; all comfortably inside "good" thresholds. No regression to investigate.

### Bug-to-regression loop (found by the new gates during the cutover)

1. StrictMode double-booted the checkout session (2× POST /sessions) —
   ref-guarded; covered by the exactly-once contract assertion.
2. `toAppError` lost mock-error envelopes (checkout CONFLICT) — duck-typed;
   covered by the empty-cart checkout path.
3. Status-fallback copy outranked curated backend-message copy — reordered;
   covered by the 500-retry checkout test.
4. Mock-mode leak tripwire caught the dead Google-Fonts request — link
   removed, favicon self-hosted.
5. An earlier token rename had mapped the shadcn `accent` utility to the
   brand color — fixed while purging the unlayered legacy CSS that had been
   silently overriding Tailwind utilities.
6. Read-notification `opacity-70` pushed muted text below AA — replaced with
   an AA-safe muted-token treatment; caught by the after-run a11y gate.

### Full-repo review gate (independent reviewer, all findings fixed)

- Blocker: gateway smoke tests each ran in a fresh browser context, dropping
  the login — now one shared page for the serial run.
- Majors: logout no longer races LoginPage's auth check; the mock-store CI
  sentinel was minified away (guard could never fail) — now a runtime store
  field, verified present in mock builds / absent in production; gateway
  failure traces (which embed the test-account login body) are no longer
  uploaded as artifacts; auth/checkout Zod boundaries coerce numeric user ids
  and tolerate omitted not-yet-set session keys.
- Minors: raw unknown backend strings can no longer reach the UI, AppError
  stops double-mapping friendly copy, the CI preview server gained a
  readiness wait, and a mock handler's thrown expect became a clean 400.
- Explicitly verified clean: axios 401/refresh/429 semantics vs main,
  notification pacing, Idempotency-Key lifecycle, SWR keys/intervals,
  mock↔e2e parity, config isolation, open-redirect guard, toast singleton.

## Pre-cutover checklist (remaining)

1. Run the gateway smoke against local-stack/staging Kong
   (`gateway-smoke.yml` dispatch or `npm run test:e2e:gateway` with env) —
   the ONE mandatory gate not yet executed. Verify there: the auth user-id
   type and checkout session field shapes against the real services.
2. Regenerate visual baselines on CI-Linux the first time the visual project
   runs there (current baselines were captured on macOS).
3. Confirm rollback: previous production image tag + deploy command
   (frontend-only rollback is independent — backend/Kong unchanged).
