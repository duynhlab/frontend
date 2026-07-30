/** User identity persisted to localStorage alongside the token pair. */
export interface StoredUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthRegisterRequest {
  username: string;
  email: string;
  password: string;
}

/** Response of login / register / refresh — a rotating token pair. */
export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  user?: StoredUser | undefined;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutResponse {
  ok: boolean;
}
