import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '@features/chats/socket';
import { setPresence } from '@features/chats/presence/presence.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectUser } from '@features/auth/auth.slice';
import { chatKeys } from '@features/chats/queryKeys';
import { getTrackedActiveChat } from '@features/notifications/activeChat';
import {
  shouldShowBrowserNotification,
  showMessageBrowserNotification,
} from '@features/notifications/browserNotification';
import { sound } from '@features/notifications/sound';
import type { ChatSummary, Message } from '@features/chats/types';

/**
 * Устанавливает WS-соединение на время нахождения в авторизованной зоне
 * и разрывает его при размонтировании (выход из аккаунта/навигация вне layout'а).
 */
export function useChatSocket() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const currentUserId = useAppSelector(selectUser)?.id;

  useEffect(() => {
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void connectSocket()
      .then((socket) => {
        if (cancelled) return;
        const onPresence = (payload: { userId: number; online: boolean; lastSeenAt?: string | null }) => {
          dispatch(setPresence(payload));
        };
        const onMessage = (payload: Message) => {
          if (
            !shouldShowBrowserNotification({
              senderId: payload.senderId,
              currentUserId,
              chatId: payload.chatId,
              activeChatId: getTrackedActiveChat(),
              tabVisible: document.visibilityState === 'visible',
            })
          ) {
            return;
          }
          sound.play('message');
          void showMessageBrowserNotification(
            payload,
            queryClient.getQueryData<ChatSummary[]>(chatKeys.list()),
            currentUserId,
          );
        };
        socket.on('presence', onPresence);
        socket.on('message:new', onMessage);
        cleanup = () => {
          socket.off('presence', onPresence);
          socket.off('message:new', onMessage);
        };
      })
      .catch((err: Error) => {
        console.warn('[ws] connect failed:', err?.message ?? err);
      });

    return () => {
      cancelled = true;
      cleanup?.();
      disconnectSocket();
    };
  }, [dispatch, currentUserId, queryClient]);
}
