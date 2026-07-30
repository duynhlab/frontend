#!/usr/bin/env bash
# Dogfood smoke: guest / customer / checkout-entry journeys.
# Collects snapshots, console, page errors, network requests, and Web Vitals.
# Deterministic assertions live in Playwright — this script is orchestration
# and artifact collection with hard runtime gates only.
cd "$(dirname "$0")/../.."
# shellcheck source=scripts/agent-browser/lib.sh
source scripts/agent-browser/lib.sh

guard_baseline_overwrite "smoke"
OUT="${OUT_ROOT}/smoke"
mkdir -p "${OUT}/snapshots" "${OUT}/vitals"

echo "== smoke against ${BASE_URL} (label: ${LABEL}) =="

# --- Journey 1: guest -------------------------------------------------------
ab_session guest
ab_open "/"
ab snapshot -i --json > "${OUT}/snapshots/guest-home.json"
ab_open "/products"
ab snapshot -i --json > "${OUT}/snapshots/guest-products.json"
ab_open "/products/prod-00001"
ab snapshot -i --json > "${OUT}/snapshots/guest-product-detail.json"
check_runtime "guest" "${OUT}"

# --- Journey 2: customer ----------------------------------------------------
ab_session customer
ab_login
ab snapshot -i --json > "${OUT}/snapshots/customer-post-login.json"
for route in /cart /orders /notifications /profile; do
  ab_open "${route}"
  ab snapshot -i --json > "${OUT}/snapshots/customer${route//\//-}.json"
done
check_runtime "customer" "${OUT}"

# --- Journey 3: checkout entry ---------------------------------------------
# Add a product to the cart and open checkout. Full step-through/submit
# coverage (promo save10, idempotency) is Playwright's job.
ab_session checkout
ab_login
ab_open "/products/prod-00001"
ab find role button click --name "Add to Cart" >/dev/null
sleep 1
ab_open "/checkout"
ab snapshot -i --json > "${OUT}/snapshots/checkout-entry.json"
check_runtime "checkout" "${OUT}"

# --- Web Vitals -------------------------------------------------------------
ab_session vitals
for route in / /products /products/prod-00001; do
  name="${route//\//-}"; [ "${name}" = "-" ] && name="home"
  ab vitals "${BASE_URL}${route}" --json > "${OUT}/vitals/${name}.json" || true
done
ab_login
for route in /cart /checkout; do
  ab_open "${route}"
  ab vitals --json > "${OUT}/vitals${route//\//-}.json" || true
done

echo "== smoke complete → ${OUT} =="
