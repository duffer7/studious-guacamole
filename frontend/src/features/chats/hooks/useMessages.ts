import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getHistory } from '@features/chats/api';
import { chatKeys } from '@features/chats/queryKeys';
import { connectSocket } from '@features/chats/socket';
import type { Message, MessageHistory } from '@features/chats/types';

const PAGE_SIZE = 50;

/** История сообщений чата с подгрузкой вверх (cursor-пагинация) и realtime-добавлением. */
export function useMessages(chatId: number | null) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: chatKeys.messages(chatId ?? -1),
    enabled: chatId !== null,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => getHistory(chatId!, { before: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage: MessageHistory) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });

  // реальное время: добавляем пришедшие сообщения в кэш
  useEffect(() => {
    if (chatId === null) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void connectSocket().then((socket) => {
      if (cancelled) return;

      const upsert = (message: Message) => {
        if (message.chatId !== chatId) return;
        queryClient.setQueryData<{
          pages: MessageHistory[];
          pageParams: unknown[];
        }>(chatKeys.messages(chatId), (prev) => {
          if (!prev || prev.pages.length === 0) return prev;

          // уже есть по id — не добавляем.
          // есть по clientMessageId — заменяем оптимистичное на серверное.
          for (const page of prev.pages) {
            if (page.items.some((m) => m.id === message.id)) {
              return prev;
            }
            if (page.items.some((m) => m.clientMessageId === message.clientMessageId)) {
              const pages = prev.pages.map((p) => ({
                ...p,
                items: p.items.map((m) =>
                  m.clientMessageId === message.clientMessageId ? message : m,
                ),
              }));
              return { ...prev, pages };
            }
          }

          const [first, ...rest] = prev.pages;
          return {
            ...prev,
            pages: [{ ...first, items: [...first.items, message] }, ...rest],
          };
        });
      };

      const onNew = (message: Message) => upsert(message);

      // ack приходит отправителю в ответ на message:send — заменяем оптимистичное на серверное
      const onAck = (message: Message) => upsert(message);

      socket.on('message:new', onNew);
      socket.on('message:ack', onAck);
      cleanup = () => {
        socket.off('message:new', onNew);
        socket.off('message:ack', onAck);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [chatId, queryClient]);

  // страницы идут от новых к старым, внутри страницы — уже хронологически.
  // Разворачиваем список страниц, чтобы получить сквозной хронологический порядок.
  const messages = useMemo(() => {
    const pages = query.data?.pages ?? [];
    return [...pages].reverse().flatMap((p) => p.items);
  }, [query.data]);

  return { ...query, messages };
}
