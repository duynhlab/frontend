/**
 * API Configuration
 *
 * Browser traffic hits Kong at `gateway.duynh.me` using Variant A edge
 * naming: `/{service}/v1/{audience}/{resource...}`. Kong rewrites these to
 * cluster `/api/v1/*` paths before proxying to the service.
 *
 * See: https://github.com/duynhlab/homelab/blob/main/docs/api/api-naming-convention.md
 */

/**
 * Edge gateway origin. Each api module owns its `/{service}/v1/{audience}`
 * prefix — config.js only decides the host.
 *
 * VITE_API_BASE_URL overrides the default (useful for local dev pointing at
 * a port-forwarded gateway, or for a staging env).
 */
export const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_BASE_URL || 'https://gateway.duynh.me';
};

/**
 * Kept for backwards compatibility with any caller that still imports this.
 * Returns an empty string because every api module now sends absolute paths
 * relative to the gateway origin.
 */
export const getBaseDomain = () => {
    return '';
};
