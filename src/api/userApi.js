import apiClient from './client';

/**
 * User API — Variant A edge paths.
 * Edge paths (gateway pass-through): /user/v1/private/users/profile, /user/v1/public/users/:id
 */

/**
 * GET /user/v1/private/users/profile
 */
export async function getUserProfile() {
    const response = await apiClient.get('/user/v1/private/users/profile');
    return response.data;
}

/**
 * GET /user/v1/public/users/:id
 */
export async function getUser(id) {
    const response = await apiClient.get(`/user/v1/public/users/${id}`);
    return response.data;
}

/**
 * PUT /user/v1/private/users/profile
 */
export async function updateProfile(profileData) {
    const response = await apiClient.put('/user/v1/private/users/profile', profileData);
    return response.data;
}
