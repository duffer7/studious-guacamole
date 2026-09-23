import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatKeys } from '@features/chats/queryKeys';
import { connectSocket } from '@features/chats/socket';
import { uuid } from '@features/chats/utils';
import type { MessageHistory, PendingMessage } from '@features/chats/types';

interface SendArgs {
  chatId: number;
  body: string;
  senderId: number;
  replyToId?: number;
}

/** Отправляет сообщение через WebSocket с оптимистичным добавлением в кэш. */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useCallback(
    async ({ chatId, body, senderId, replyToId }: SendArgs) => {
      const socket = await connectSocket();
      const clientMessageId = uuid();

      const optimistic: PendingMessage = {
        id: -Date.now(),
        chatId,
        senderId,
        body,
        type: 'text',
        clientMessageId,
        replyToId: replyToId ?? null,
        createdAt: new Date().toISOString(),
        pending: true,
      };

      queryClient.setQueryData<{ pages: MessageHistory[]; pageParams: unknown[] }>(
        chatKeys.messages(chatId),
        (prev) => {
          if (!prev || prev.pages.length === 0) return prev;
          const [first, ...rest] = prev.pages;
          return {
            ...prev,
            pages: [{ ...first, items: [...first.items, optimistic] }, ...rest],
          };
        },
      );

      socket.emit('message:send', { chatId, body, clientMessageId, replyToId });

      // после ack серверная копия заменит оптимистичную — подстрахуемся инвалидацией списка
      void queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
    [queryClient],
  );
}
