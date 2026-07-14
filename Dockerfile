# ===================================
# Stage 1: Build Frontend with Node 24
# ===================================
FROM node:26-alpine AS builder
RUN apk add --no-cache --upgrade zlib libcrypto3 libssl3 nghttp2-libs

# Build argument for API base URL. Leave it UNSET for the cloud topology
# (config.js then defaults to https://gateway.duynh.me); pass a value to
# override — including an explicit "" for the same-origin/reverse-proxy
# deploy (config.js honors "" via ?? — see src/api/config.js).
ARG API_BASE_URL

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
