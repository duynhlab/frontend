import apiClient from './client';

/**
 * User API — Variant A edge paths.
 * Cluster mounts (reference): /api/v1/users, /api/v1/users/:id, /api/v1/users/profile
 */

/**
 * GET /user/v1/private/users/profile  →  /api/v1/users/profile
 */
export async function getUserProfile() {
    const response = await apiClient.get('/user/v1/private/users/profile');
    return response.data;
}

/**
 * GET /user/v1/public/users/:id  →  /api/v1/users/:id
 */
export async function getUser(id) {
    const response = await apiClient.get(`/user/v1/public/users/${id}`);
    return response.data;
}

/**
 * PUT /user/v1/private/users/profile  →  /api/v1/users/profile
 */
export async function updateProfile(profileData) {
    const response = await apiClient.put('/user/v1/private/users/profile', profileData);
    return response.data;
}
