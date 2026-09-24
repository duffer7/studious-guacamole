import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatKeys } from '@features/chats/queryKeys';
import { connectSocket } from '@features/chats/socket';
import { uuid } from '@features/chats/utils';
import type { MessageHistory, PendingMessage } from '@features/chats/types';

interface SendArgs {
  chatId: number;
  body?: string;
  senderId: number;
  replyToId?: number;
  attachment?: {
    key: string;
    name: string;
    mime: string;
    size: number;
  };
}

/** Отправляет сообщение через WebSocket с оптимистичным добавлением в кэш. */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useCallback(
    async ({ chatId, body, senderId, replyToId, attachment }: SendArgs) => {
      const socket = await connectSocket();
      const clientMessageId = uuid();

      const optimistic: PendingMessage = {
        id: -Date.now(),
        chatId,
        senderId,
        body: body ?? null,
        type: attachment ? 'file' : 'text',
        clientMessageId,
        replyToId: replyToId ?? null,
        createdAt: new Date().toISOString(),
        pending: true,
        attachmentKey: attachment?.key ?? null,
        attachmentName: attachment?.name ?? null,
        attachmentMime: attachment?.mime ?? null,
        attachmentSize: attachment?.size ?? null,
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

      socket.emit('message:send', {
        chatId,
        body: body ?? '',
        clientMessageId,
        replyToId,
        attachment,
      });

      // после ack серверная копия заменит оптимистичную — подстрахуемся инвалидацией списка
      void queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
    [queryClient],
  );
}
