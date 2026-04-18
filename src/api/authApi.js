import apiClient from './client';

/**
 * Auth API — Variant A edge paths.
 * Cluster mounts (reference): /api/v1/auth/login, /api/v1/auth/register, /api/v1/auth/me
 */

/**
 * POST /auth/v1/public/login  →  /api/v1/auth/login
 */
export async function login(username, password) {
    const response = await apiClient.post('/auth/v1/public/login', { username, password });
    return response.data;
}

/**
 * POST /auth/v1/public/register  →  /api/v1/auth/register
 */
export async function register(username, email, password) {
    const response = await apiClient.post('/auth/v1/public/register', { username, email, password });
    return response.data;
}

/**
 * GET /auth/v1/private/me  →  /api/v1/auth/me
 */
export async function getMe() {
    const response = await apiClient.get('/auth/v1/private/me');
    return response.data;
}
