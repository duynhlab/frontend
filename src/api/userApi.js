import apiClient from './client';
import { USE_MOCK } from './useMock';
import * as mock from './mock';

/**
 * User API — Variant A edge paths.
 * Edge paths (gateway pass-through): /user/v1/private/users/profile, /user/v1/public/users/:id
 */

/**
 * GET /user/v1/private/users/profile
 */
export async function getUserProfile() {
    if (USE_MOCK) return mock.mockGetUserProfile();
    const response = await apiClient.get('/user/v1/private/users/profile');
    return response.data;
}

/**
 * GET /user/v1/public/users/:id
 */
export async function getUser(id) {
    if (USE_MOCK) return mock.mockGetUser(id);
    const response = await apiClient.get(`/user/v1/public/users/${id}`);
    return response.data;
}

/**
 * PUT /user/v1/private/users/profile
 */
export async function updateProfile(profileData) {
    if (USE_MOCK) return mock.mockUpdateProfile(profileData);
    const response = await apiClient.put('/user/v1/private/users/profile', profileData);
    return response.data;
}
