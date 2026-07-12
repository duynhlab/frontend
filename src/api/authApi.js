import apiClient from './client';

/**
 * Auth API — Variant A edge paths (JWT-only, RFC-0009 Phase 5).
 * Edge paths (gateway pass-through): /auth/v1/public/auth/{login,register,refresh,logout}
 */

/**
 * POST /auth/v1/public/auth/login
 */
export async function login(username, password) {
    const response = await apiClient.post('/auth/v1/public/auth/login', { username, password });
    return response.data;
}

/**
 * POST /auth/v1/public/auth/register
 */
export async function register(username, email, password) {
    const response = await apiClient.post('/auth/v1/public/auth/register', { username, email, password });
    return response.data;
}

/**
 * POST /auth/v1/public/auth/logout — revokes the refresh token's whole family
 * server-side (the access token simply expires; JWTs are stateless).
 * Best-effort: callers should clear local auth state regardless of the result.
 */
export async function logout(refreshToken) {
    const response = await apiClient.post(
        '/auth/v1/public/auth/logout',
        { refresh_token: refreshToken },
        { skipAuthRefresh: true }
    );
    return response.data;
}
