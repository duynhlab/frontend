import apiClient from './client';

/**
 * Auth API — Variant A edge paths.
 * Edge paths (gateway pass-through): /auth/v1/public/{login,register}, /auth/v1/private/{me,logout}
 */

/**
 * POST /auth/v1/public/login
 */
export async function login(username, password) {
    const response = await apiClient.post('/auth/v1/public/login', { username, password });
    return response.data;
}

/**
 * POST /auth/v1/public/register
 */
export async function register(username, email, password) {
    const response = await apiClient.post('/auth/v1/public/register', { username, email, password });
    return response.data;
}

/**
 * GET /auth/v1/private/me
 */
export async function getMe() {
    const response = await apiClient.get('/auth/v1/private/me');
    return response.data;
}

/**
 * POST /auth/v1/private/logout — revokes the current session token server-side.
 * Best-effort: callers should clear local auth state regardless of the result.
 */
export async function logout() {
    const response = await apiClient.post('/auth/v1/private/logout');
    return response.data;
}
