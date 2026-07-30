export interface UserProfile {
  id: string;
  username: string;
  email: string;
  name: string;
  phone: string;
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
}
