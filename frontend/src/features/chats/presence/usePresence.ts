import { useAppSelector } from '@/store/hooks';

interface PresenceFallback {
  online?: boolean | null;
  lastSeenAt?: string | null;
}

/** Живой статус из сокета, иначе значение из ответа API. */
export function usePresence(userId: number | undefined, fallback?: PresenceFallback) {
  const live = useAppSelector((state) => (userId ? state.presence.byUserId[userId] : undefined));
  if (live) return live;
  return {
    online: fallback?.online ?? null,
    lastSeenAt: fallback?.lastSeenAt ?? null,
  };
}
