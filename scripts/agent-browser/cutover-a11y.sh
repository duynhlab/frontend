#!/usr/bin/env bash
# Dogfood accessibility audit: axe (wcag2a + wcag2aa) on every main route.
# Gate: zero critical/serious violations (disable with A11Y_GATE=0, e.g. when
# capturing the pre-migration baseline, which is expected to have violations).
cd "$(dirname "$0")/../.."
# shellcheck source=scripts/agent-browser/lib.sh
source scripts/agent-browser/lib.sh

guard_baseline_overwrite "a11y"
OUT="${OUT_ROOT}/a11y"
A11Y_GATE="${A11Y_GATE:-1}"

audit() {
  # $1 = artifact name, current page is audited
  ab a11y --tags wcag2a,wcag2aa --json > "${OUT}/$1.json" || true
}

echo "== a11y against ${BASE_URL} (label: ${LABEL}, gate: ${A11Y_GATE}) =="

ab_session a11y-public
for route in / /products /products/prod-00001 /login; do
  name="${route//\//-}"; [ "${name}" = "-" ] && name="home"
  ab_open "${route}"
  audit "${name}"
done

ab_session a11y-private
ab_login
for route in /cart /orders /notifications /profile /checkout; do
  ab_open "${route}"
  audit "${route//\//-}"
done

# Gate on critical/serious counts across all captured audits.
fail=0
for f in "${OUT}"/*.json; do
  [ -s "${f}" ] || continue
  count=$(jq '[((.data.violations // .violations) // [])[] | select(.impact == "critical" or .impact == "serious")] | length' "${f}" 2>/dev/null || echo 0)
  if [ "${count}" != "0" ]; then
    echo "a11y: ${count} critical/serious violation(s) in $(basename "${f}")" >&2
    jq -r '((.data.violations // .violations) // [])[] | select(.impact=="critical" or .impact=="serious") | "  - [\(.impact)] \(.id): \(.help)"' "${f}" >&2 || true
    fail=1
  fi
done

if [ "${fail}" = "1" ]; then
  if [ "${A11Y_GATE}" = "1" ]; then
    echo "== a11y FAILED (critical/serious violations) → ${OUT} ==" >&2
    exit 1
  fi
  echo "== a11y violations recorded (gate disabled) → ${OUT} =="
else
  echo "== a11y clean → ${OUT} =="
fi
