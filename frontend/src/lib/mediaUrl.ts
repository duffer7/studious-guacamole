const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

/** Путь `/uploads/...` из MinIO-прокси бэкенда. */
export function mediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}
