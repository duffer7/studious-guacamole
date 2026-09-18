import { request } from '@/api/client';
import type { LoginDto, LoginResult, RegisterDto, User } from '@features/auth/types';

/** POST /auth/login. Может вернуть токены либо { mfaRequired: true }. */
export function login(dto: LoginDto): Promise<LoginResult> {
  return request<LoginResult>('/auth/login', {
    method: 'POST',
    body: dto,
    skipAuth: true,
    skipRefresh: true,
  });
}

/** POST /auth/register. */
export function register(dto: RegisterDto): Promise<User> {
  return request<User>('/auth/register', {
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

/** POST /auth/logout — выход из текущей сессии. */
export function logout(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST' });
}

/** POST /auth/logout-all — выход со всех устройств. */
export function logoutAll(): Promise<void> {
  return request<void>('/auth/logout-all', { method: 'POST' });
}
