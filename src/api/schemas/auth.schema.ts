import { z } from "zod";
import type { AuthTokensResponse } from "@/api/types/auth";

/**
 * Runtime validation for the auth boundary only (high-risk: a malformed
 * token payload silently corrupts the whole session). Other services trust
 * their DTO types — do not Zod-parse every response (AGENTS.md).
 */
export const authTokensResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  user: z
    .object({
      // Coerced: parts of the platform have historically used numeric ids
      // (the legacy UI String()-coerced them everywhere).
      id: z.coerce.string<string>().min(1),
      username: z.string().min(1),
      email: z.string(),
    })
    .optional(),
}) satisfies z.ZodType<AuthTokensResponse, unknown>;

export function parseAuthTokensResponse(data: unknown): AuthTokensResponse {
  return authTokensResponseSchema.parse(data);
}
