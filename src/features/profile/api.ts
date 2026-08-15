import { apiFetch } from '@/lib/api'

export interface Profile {
  id: string
  username: string
  email: string
  name: string
  phone: string
}

export function getProfile(signal?: AbortSignal): Promise<Profile> {
  return apiFetch<Profile>('/user/v1/private/users/profile', { signal })
}

export function updateProfile(input: {
  name: string
  email: string
  phone: string
}): Promise<Profile> {
  return apiFetch<Profile>('/user/v1/private/users/profile', {
    method: 'PUT',
    body: input,
  })
}
