# ===================================
# Stage 1: Build Frontend with Node 26
# ===================================
# NOTE: CI lints and builds on Node 24 (check.yml, .nvmrc), so the released
# image is produced on a runtime CI never exercises. admin-service has the
# same drift; aligning the fleet is its own change, not this one.
# --platform pins the builder to the BUILD host. The vite output in dist/ is
# architecture-independent, so a multi-arch build only pays for the runtime
# stage instead of running npm ci + vite under emulation.
FROM --platform=$BUILDPLATFORM node:26-alpine AS builder
RUN apk add --no-cache --upgrade zlib libcrypto3 libssl3 nghttp2-libs

# Build argument for API base URL. Leave it UNSET for the cloud topology
# (.env then supplies https://gateway.duynh.me); pass a value to override —
# including an explicit "" for the same-origin/reverse-proxy deploy, which
# src/lib/api.ts honors via `??`.
ARG API_BASE_URL

# Keycloak OIDC build arguments (same conditional-bake pattern as
# API_BASE_URL — see src/lib/auth.ts for the in-code defaults):
#   KEYCLOAK_URL       unset → http://localhost:8081 (local dev); the cluster
#                      build passes https://id.duynh.me
#   KEYCLOAK_REALM     unset → duynhlab
#   KEYCLOAK_CLIENT_ID unset → customer-spa
ARG KEYCLOAK_URL
ARG KEYCLOAK_REALM
ARG KEYCLOAK_CLIENT_ID

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Bake VITE_API_BASE_URL only when the build-arg was provided: a blanket
# ENV turned "no arg" into an explicit empty string, which config.js reads
# as the same-origin topology — so every CI image sent the cluster SPA's
# API calls to its own nginx origin (405 at login).
RUN if [ -n "${API_BASE_URL+x}" ]; then export VITE_API_BASE_URL="$API_BASE_URL"; fi \
    && if [ -n "${KEYCLOAK_URL+x}" ]; then export VITE_KEYCLOAK_URL="$KEYCLOAK_URL"; fi \
    && if [ -n "${KEYCLOAK_REALM+x}" ]; then export VITE_KEYCLOAK_REALM="$KEYCLOAK_REALM"; fi \
    && if [ -n "${KEYCLOAK_CLIENT_ID+x}" ]; then export VITE_KEYCLOAK_CLIENT_ID="$KEYCLOAK_CLIENT_ID"; fi \
    && npm run build

# Verify dist folder was created
RUN ls -la /app/dist

# ===================================
# Stage 2: Production with Nginx
# ===================================
FROM nginx:alpine
# Upgrade all OS packages to clear known Alpine CVEs in the runtime image
# (this is the image Trivy scans). A full upgrade is more durable than a fixed
# package list — e.g. libcrypto3/libssl3 (CVE-2026-45447) and libxml2
# (CVE-2026-6732) all ship fixes in the Alpine index.
RUN apk -U --no-cache upgrade

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
