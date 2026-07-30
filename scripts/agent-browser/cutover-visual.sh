#!/usr/bin/env bash
# Dogfood visual capture: full-page screenshots on desktop (1440x900),
# mobile (390x844) and narrow mobile (360x800), plus annotated shots of the
# key interactive surfaces. Compare runs with:
#   agent-browser diff screenshot --baseline dogfood-output/.../before/... -o diff.png
cd "$(dirname "$0")/../.."
# shellcheck source=scripts/agent-browser/lib.sh
source scripts/agent-browser/lib.sh

guard_baseline_overwrite "visual"
OUT="${OUT_ROOT}/visual"

declare -a VIEWPORTS=("desktop 1440 900" "mobile 390 844" "narrow 360 800")
PUBLIC_ROUTES=(/ /products /products/prod-00001 /login)
PRIVATE_ROUTES=(/cart /orders /notifications /profile /checkout)

shot() {
  # $1 = viewport dir, $2 = name
  ab screenshot --full "${OUT}/$1/$2.png" >/dev/null
}

echo "== visual against ${BASE_URL} (label: ${LABEL}) =="

for vp in "${VIEWPORTS[@]}"; do
  read -r vp_name vp_w vp_h <<< "${vp}"
  mkdir -p "${OUT}/${vp_name}"

  ab_session "visual-${vp_name}-public"
  ab_open "/"
  ab set viewport "${vp_w}" "${vp_h}" >/dev/null
  for route in "${PUBLIC_ROUTES[@]}"; do
    name="${route//\//-}"; [ "${name}" = "-" ] && name="home"
    ab_open "${route}"
    shot "${vp_name}" "${name}"
  done

  ab_session "visual-${vp_name}-private"
  ab_open "/"
  ab set viewport "${vp_w}" "${vp_h}" >/dev/null
  ab_login
  for route in "${PRIVATE_ROUTES[@]}"; do
    ab_open "${route}"
    shot "${vp_name}" "${route//\//-}"
  done
done

# Annotated screenshots of key surfaces (desktop) — reveals missing accessible
# names, overlapped controls, and confusing focus order.
mkdir -p "${OUT}/annotated"
ab_session visual-annotated
ab_open "/"
ab set viewport 1440 900 >/dev/null
ab_open "/login"
ab screenshot --annotate "${OUT}/annotated/login.png" > "${OUT}/annotated/login-legend.txt" || true
ab_login
ab_open "/products"
ab screenshot --annotate "${OUT}/annotated/products.png" > "${OUT}/annotated/products-legend.txt" || true
ab_open "/cart"
ab screenshot --annotate "${OUT}/annotated/cart.png" > "${OUT}/annotated/cart-legend.txt" || true
ab_open "/checkout"
ab screenshot --annotate "${OUT}/annotated/checkout.png" > "${OUT}/annotated/checkout-legend.txt" || true

echo "== visual complete → ${OUT} =="
