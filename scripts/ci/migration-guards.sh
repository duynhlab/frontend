#!/usr/bin/env bash
# Post-cutover invariants (plan §17.3). Run AFTER a successful production
# build so dist/ exists. Each guard prints what it checks and fails loudly.
set -euo pipefail

echo "guard: no JavaScript/JSX application or e2e source"
leftovers="$(find src e2e -type f \( -name '*.js' -o -name '*.jsx' \) -print)"
if [ -n "${leftovers}" ]; then
  echo "FAIL — JS/JSX files remain:" >&2
  echo "${leftovers}" >&2
  exit 1
fi

echo "guard: react-hot-toast fully removed"
if grep -rn "react-hot-toast\|HotToaster" src e2e package.json README.md AGENTS.md 2>/dev/null; then
  echo "FAIL — react-hot-toast references remain" >&2
  exit 1
fi
if npm ls react-hot-toast >/dev/null 2>&1; then
  echo "FAIL — react-hot-toast still resolvable in node_modules" >&2
  exit 1
fi

echo "guard: single shadcn foundation (no radix)"
if grep -q '"@radix-ui/' package-lock.json; then
  echo "FAIL — @radix-ui packages in the lockfile (mixed foundations)" >&2
  exit 1
fi

echo "guard: production build refuses VITE_USE_MOCK=true (negative test)"
if VITE_USE_MOCK=true npx vite build --logLevel error >/dev/null 2>&1; then
  echo "FAIL — production build must refuse VITE_USE_MOCK=true" >&2
  exit 1
fi

echo "guard: mock store absent from production assets"
if [ ! -d dist/assets ]; then
  echo "FAIL — dist/assets missing; run the real build before the guards" >&2
  exit 1
fi
if grep -Rq "__APP_MOCK_STORE__" dist/assets/; then
  echo "FAIL — mock store sentinel found in the production bundle" >&2
  exit 1
fi

echo "All migration guards passed."
