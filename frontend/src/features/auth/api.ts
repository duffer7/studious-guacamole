import { request } from '@/api/client';
import type { LoginDto, LoginResult, User } from '@/features/auth/types';

/** POST /auth/login. Может вернуть токены либо { mfaRequired: true }. */
export function login(dto: LoginDto): Promise<LoginResult> {
  console.log('fdf');
  return request<LoginResult>('/auth/login', {
    method: 'POST',
    body: dto,
    skipAuth: true,
    skipRefresh: true,
  });
}

/** GET текущего пользователя по access-токену. */
export function getMe(): Promise<User> {
  return request<User>('/users/me');
}
