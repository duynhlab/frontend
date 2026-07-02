import apiClient from './client';

/**
 * Auth API — Variant A edge paths (JWT-only, RFC-0009 Phase 5).
 * Edge paths (gateway pass-through): /auth/v1/public/{login,register,refresh,logout}
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
 * POST /auth/v1/public/logout — revokes the refresh token's whole family
 * server-side (the access token simply expires; JWTs are stateless).
 * Best-effort: callers should clear local auth state regardless of the result.
 */
export async function logout(refreshToken) {
    const response = await apiClient.post(
        '/auth/v1/public/logout',
        { refresh_token: refreshToken },
        { skipAuthRefresh: true }
    );
    return response.data;
}
