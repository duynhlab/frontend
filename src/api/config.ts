/**
 * API Configuration
 *
 * Browser traffic hits Kong at `gateway.duynh.me` using Variant A edge
 * naming: `/{service}/v1/{audience}/{resource...}`. Kong is pass-through —
 * it proxies that exact path to the service, with no rewrite. The path the
 * SPA sends is the path end-to-end (do not add an `/api/v1/*` prefix).
 *
 * See: https://github.com/duynhlab/homelab/blob/main/docs/api/api-naming-convention.md
 */

/**
 * API origin. Each api module owns its `/{service}/v1/{audience}` prefix —
 * config.ts only decides the host.
 *
 * VITE_API_BASE_URL (baked at build time) selects the deployment topology:
 *   - unset  → cloud default `https://gateway.duynh.me` (SPA on local.duynh.me
 *              calls the cross-origin Kong gateway).
 *   - set to "" → same-origin / relative: the SPA and API share one origin
 *              behind a local reverse proxy (the RPM deploy, nginx as gateway).
 *
 * Note: `??` (not `||`) so an explicit empty string is honored as "relative" —
 * `'' || x` would wrongly fall back to the cloud default.
 */
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL ?? "https://gateway.duynh.me";
};
