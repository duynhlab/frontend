import type { AuthLoginRequest, RefreshTokenRequest } from "@/api/types/auth";
import { apiError, json, type ApiHandler } from "../server";
import { E2E_PASSWORD, E2E_USER, tokensFor } from "../responses/auth.responses";

export const authHandlers: ApiHandler[] = [
  {
    method: "POST",
    path: /\/auth\/v1\/public\/auth\/login$/,
    fulfill: ({ route, request }) => {
      const body = request.postDataJSON() as AuthLoginRequest;
      if (body.username === E2E_USER.username && body.password === E2E_PASSWORD) {
        return json(route, tokensFor(0));
      }
      return apiError(route, "Invalid email or password", 401);
    },
  },
  {
    method: "POST",
    path: /\/auth\/v1\/public\/auth\/register$/,
    fulfill: ({ route }) => json(route, tokensFor(0)),
  },
  {
    method: "POST",
    path: /\/auth\/v1\/public\/auth\/refresh$/,
    fulfill: ({ route, request, state }) => {
      const body = request.postDataJSON() as RefreshTokenRequest;
      if (!body.refresh_token) {
        return apiError(route, "Invalid or expired token", 401);
      }
      state.refreshCount += 1;
      state.tokenGeneration += 1;
      return json(route, tokensFor(state.tokenGeneration));
    },
  },
  {
    method: "POST",
    path: /\/auth\/v1\/public\/auth\/logout$/,
    fulfill: ({ route }) => json(route, { ok: true }),
  },
];
