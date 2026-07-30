import apiClient from "./client";
import * as mock from "./mock";
import type {
  PublicUser,
  UpdateProfileRequest,
  UserProfile,
} from "./types/user";

/**
 * User API — Variant A edge paths.
 * Edge paths (gateway pass-through): /user/v1/private/users/profile, /user/v1/public/users/:id
 */

/**
 * GET /user/v1/private/users/profile
 */
export async function getUserProfile(): Promise<UserProfile> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetUserProfile();
  const response = await apiClient.get<UserProfile>(
    "/user/v1/private/users/profile",
  );
  return response.data;
}

/**
 * GET /user/v1/public/users/:id
 */
export async function getUser(id: string): Promise<PublicUser> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetUser(id);
  const response = await apiClient.get<PublicUser>(`/user/v1/public/users/${id}`);
  return response.data;
}

/**
 * PUT /user/v1/private/users/profile
 */
export async function updateProfile(
  profileData: UpdateProfileRequest,
): Promise<UserProfile> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockUpdateProfile(profileData);
  const response = await apiClient.put<UserProfile>(
    "/user/v1/private/users/profile",
    profileData,
  );
  return response.data;
}
