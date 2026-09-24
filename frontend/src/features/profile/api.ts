import { request } from '@/api/client';
import type { User } from '@features/auth/types';

export function updateProfile(displayName: string): Promise<User> {
  return request<User>('/users/me', { method: 'PATCH', body: { displayName } });
}

export function uploadAvatar(image: string): Promise<User> {
  return request<User>('/users/me/avatar', { method: 'POST', body: { image } });
}

export function deleteAvatar(): Promise<User> {
  return request<User>('/users/me/avatar', { method: 'DELETE' });
}
