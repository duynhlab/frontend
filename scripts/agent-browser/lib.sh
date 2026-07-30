#!/usr/bin/env bash
# Shared prologue for the agent-browser cutover scripts.
# Source this file; do not execute it directly.
#
# Inputs (env):
#   BASE_URL   app under test          (default http://localhost:3000)
#   LABEL      artifact tree label     (default run; use before/after for baselines)
#   FORCE      1 = allow overwriting an existing before/ tree
#
# The app must already be running (mock mode recommended for local dogfood).
# Never point these scripts at production with real credentials.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
LABEL="${LABEL:-run}"
OUT_ROOT="dogfood-output/shadcn-cutover/${LABEL}"

# Containment: local targets only unless the caller widens it deliberately.
export AGENT_BROWSER_ALLOWED_DOMAINS="${AGENT_BROWSER_ALLOWED_DOMAINS:-localhost,127.0.0.1}"
export AGENT_BROWSER_CONTENT_BOUNDARIES=1
export AGENT_BROWSER_MAX_OUTPUT=50000

# Demo credentials for the seeded/mock account only. Never real secrets.
AB_USERNAME="${AB_USERNAME:-alice}"
AB_PASSWORD="${AB_PASSWORD:-password123}"

AB_SESSION=""

ab() {
  npx agent-browser --session "${AB_SESSION}" "$@"
}

ab_cleanup() {
  if [ -n "${AB_SESSION}" ]; then
    npx agent-browser --session "${AB_SESSION}" close >/dev/null 2>&1 || true
  fi
}
trap ab_cleanup EXIT

ab_session() {
  # Close the previous journey session (if any) and start a fresh one.
  ab_cleanup
  AB_SESSION="cutover-$1-$$"
}

guard_baseline_overwrite() {
  # $1 = subdirectory owned by the calling script
  local dir="${OUT_ROOT}/$1"
  if [ "${LABEL}" = "before" ] && [ -d "${dir}" ] && [ -n "$(ls -A "${dir}" 2>/dev/null)" ] \
     && [ "${FORCE:-0}" != "1" ]; then
    echo "Refusing to overwrite baseline ${dir} (set FORCE=1 to override)" >&2
    exit 1
  fi
  mkdir -p "${dir}"
}

ab_open() {
  ab open "${BASE_URL}$1" >/dev/null
  ab wait --load networkidle >/dev/null 2>&1 || sleep 1
}

ab_login() {
  # Works on both the legacy form (placeholder, unlabeled password) and the
  # shadcn form (labeled fields). Never echoes the password.
  ab_open "/login"
  if ! ab find label "Username" fill "${AB_USERNAME}" >/dev/null 2>&1; then
    ab fill "input[placeholder=\"alice\"]" "${AB_USERNAME}" >/dev/null
  fi
  if ! ab find label "Password" fill "${AB_PASSWORD}" >/dev/null 2>&1; then
    ab fill "input[type=\"password\"]" "${AB_PASSWORD}" >/dev/null
  fi
  ab find role button click --name "Login" >/dev/null
  ab wait --load networkidle >/dev/null 2>&1 || sleep 1
}

check_runtime() {
  # $1 = journey name, $2 = output dir. Fails on uncaught errors, console
  # errors, React warnings, or requests escaping the app/mock boundary.
  local journey="$1" dir="$2"
  ab console --json > "${dir}/${journey}-console.json" || true
  ab errors > "${dir}/${journey}-errors.txt" || true
  ab network requests --json > "${dir}/${journey}-network.json" 2>/dev/null || echo '[]' > "${dir}/${journey}-network.json"

  if [ -s "${dir}/${journey}-errors.txt" ] && grep -qiv "no errors" "${dir}/${journey}-errors.txt"; then
    echo "FAIL(${journey}): uncaught page errors:" >&2
    cat "${dir}/${journey}-errors.txt" >&2
    return 1
  fi

  local console_errors
  console_errors=$(jq '[.[] | select((.type // .level // "") == "error")] | length' \
    "${dir}/${journey}-console.json" 2>/dev/null || echo 0)
  if [ "${console_errors}" != "0" ]; then
    echo "FAIL(${journey}): ${console_errors} console error(s) — see ${journey}-console.json" >&2
    return 1
  fi

  local react_warnings
  react_warnings=$(jq '[.[] | select(((.text // .message // "") | test("Warning:")))] | length' \
    "${dir}/${journey}-console.json" 2>/dev/null || echo 0)
  if [ "${react_warnings}" != "0" ]; then
    echo "FAIL(${journey}): React warning(s) in console — see ${journey}-console.json" >&2
    return 1
  fi

  local bad_requests
  bad_requests=$(jq '[.[] | select(((.url // "") | test("/internal|/api/v1/")) )] | length' \
    "${dir}/${journey}-network.json" 2>/dev/null || echo 0)
  if [ "${bad_requests}" != "0" ]; then
    echo "FAIL(${journey}): request(s) to forbidden paths — see ${journey}-network.json" >&2
    return 1
  fi
  echo "ok(${journey}): runtime clean"
}
