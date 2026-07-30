import type { AuthTokensResponse, StoredUser } from "@/api/types/auth";
import type { UserProfile } from "@/api/types/user";

export const E2E_USER = {
  id: "user-e2e-001",
  username: "alice",
  email: "alice@example.com",
} satisfies StoredUser;

export const E2E_PASSWORD = "password123";

/** Deterministic, obviously-fake token pair (unique per grant via suffix). */
export function tokensFor(generation = 0): AuthTokensResponse {
  return {
    access_token: `e2e-access-token-${generation}`,
    refresh_token: `e2e-refresh-token-${generation}`,
    user: { ...E2E_USER },
  } satisfies AuthTokensResponse;
}

export const seedProfile = {
  id: E2E_USER.id,
  username: E2E_USER.username,
  email: E2E_USER.email,
  name: "Alice E2E",
  phone: "+84 90 000 0000",
} satisfies UserProfile;
