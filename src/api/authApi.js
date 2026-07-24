import apiClient from './client';
import { USE_MOCK } from './useMock';
import * as mock from './mock';

/**
 * Auth API — Variant A edge paths (JWT-only, RFC-0009 Phase 5).
 * Edge paths (gateway pass-through): /auth/v1/public/auth/{login,register,refresh,logout}
 */

/**
 * POST /auth/v1/public/auth/login
 */
export async function login(username, password) {
    if (USE_MOCK) return mock.mockLogin(username, password);
    const response = await apiClient.post('/auth/v1/public/auth/login', { username, password });
    return response.data;
}

/**
 * POST /auth/v1/public/auth/register
 */
export async function register(username, email, password) {
    if (USE_MOCK) return mock.mockRegister(username, email, password);
    const response = await apiClient.post('/auth/v1/public/auth/register', { username, email, password });
    return response.data;
}

/**
 * POST /auth/v1/public/auth/logout — revokes the refresh token's whole family
 * server-side (the access token simply expires; JWTs are stateless).
 * Best-effort: callers should clear local auth state regardless of the result.
 */
export async function logout(refreshToken) {
    if (USE_MOCK) return mock.mockLogout(refreshToken);
    const response = await apiClient.post(
        '/auth/v1/public/auth/logout',
        { refresh_token: refreshToken },
        { skipAuthRefresh: true }
    );
    return response.data;
}
