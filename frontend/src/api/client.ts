const API_BASE_URL = import.meta.env.VITE_API_URL;

let accessToken: string | null = null;
let refreshToken: string | null = null;

/** Колбэк, вызываемый, когда refresh не удался (сессия окончательно истекла). */
let onUnauthorized: (() => void) | null = null;

export function setTokens(tokens: {
  accessToken: string | null;
  refreshToken: string | null;
}): void {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setOnUnauthorized(cb: (() => void) | null): void {
  onUnauthorized = cb;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Тело запроса — сериализуется в JSON автоматически. */
  body?: unknown;
  /** Не добавлять заголовок Authorization. */
  skipAuth?: boolean;
  /** Не пытаться обновлять токен при 401 (для самого /auth/refresh). */
  skipRefresh?: boolean;
}

/**
 * Единственная точка входа для запросов к API.
 * При 401 один раз пытается обновить токен и повторяет исходный запрос.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, skipRefresh, headers, ...rest } = options;

  const doFetch = async (): Promise<Response> => {
    const finalHeaders = new Headers(headers);
    if (body !== undefined) finalHeaders.set('Content-Type', 'application/json');
    if (!skipAuth && accessToken) {
      finalHeaders.set('Authorization', `Bearer ${accessToken}`);
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response = await doFetch();

  if (response.status === 401 && !skipAuth && !skipRefresh) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await doFetch();
    } else {
      onUnauthorized?.();
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => undefined);
    throw new ApiError(response.status, `Request failed: ${response.status}`, errorBody);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

/** Пытается обновить пару токенов. Возвращает true при успехе. */
async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const data = await request<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true,
      skipRefresh: true,
    });
    setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
    return true;
  } catch {
    setTokens({ accessToken: null, refreshToken: null });
    return false;
  }
}
