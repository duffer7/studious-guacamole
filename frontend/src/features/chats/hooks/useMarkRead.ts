import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { markRead } from '@features/chats/api';
import { chatKeys } from '@features/chats/queryKeys';
import { connectSocket } from '@features/chats/socket';
import type { ChatSummary } from '@features/chats/types';

/** Отмечает чат прочитанным до указанного сообщения (REST + WS). */
export function useMarkRead() {
  const queryClient = useQueryClient();

  return useCallback(
    async (chatId: number, upToId: number) => {
      // оптимистично обнуляем счётчик непрочитанных в списке
      queryClient.setQueryData<ChatSummary[]>(chatKeys.list(), (prev) =>
        prev?.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
      );

      try {
        await markRead(chatId, upToId);
        const socket = await connectSocket();
        socket.emit('message:read', { chatId, upToId });
      } catch {
        void queryClient.invalidateQueries({ queryKey: chatKeys.list() });
      }
    },
    [queryClient],
  );
}
