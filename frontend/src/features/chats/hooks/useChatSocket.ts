import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '@features/chats/socket';
import { setPresence } from '@features/chats/presence/presence.slice';
import { useAppDispatch } from '@/store/hooks';

/**
 * Устанавливает WS-соединение на время нахождения в авторизованной зоне
 * и разрывает его при размонтировании (выход из аккаунта/навигация вне layout'а).
 */
export function useChatSocket() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void connectSocket()
      .then((socket) => {
        if (cancelled) return;
        const onPresence = (payload: { userId: number; online: boolean; lastSeenAt?: string | null }) => {
          dispatch(setPresence(payload));
        };
        socket.on('presence', onPresence);
        cleanup = () => socket.off('presence', onPresence);
      })
      .catch((err: Error) => {
        console.warn('[ws] connect failed:', err?.message ?? err);
      });

    return () => {
      cancelled = true;
      cleanup?.();
      disconnectSocket();
    };
  }, [dispatch]);
}
