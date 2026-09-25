import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listChats } from '@features/chats/api';
import { chatKeys } from '@features/chats/queryKeys';
import { connectSocket } from '@features/chats/socket';
import type { ChatSummary } from '@features/chats/types';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@features/auth/auth.slice';

/**
 * Список чатов + подписка на realtime-события, влияющие на список:
 * новое сообщение (обновляем lastMessage/unreadCount), новый чат, изменение участников.
 */
export function useChats() {
  const queryClient = useQueryClient();
  const currentUserId = useAppSelector(selectUser)?.id;

  const query = useQuery({
    queryKey: chatKeys.list(),
    queryFn: listChats,
  });

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void connectSocket().then((socket) => {
      if (cancelled) return;

      const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: chatKeys.list() });
      };

      const onNew = () => invalidate();
      const onChatNew = (chat: ChatSummary) => {
        queryClient.setQueryData<ChatSummary[]>(chatKeys.list(), (prev) => {
          if (!prev) return prev;
          if (prev.some((c) => c.id === chat.id)) return prev;
          return [chat, ...prev];
        });
      };
      const onRemoved = (payload: { chatId: number; userId: number }) => {
        if (payload.userId === currentUserId) {
          queryClient.setQueryData<ChatSummary[]>(chatKeys.list(), (prev) =>
            prev?.filter((chat) => chat.id !== payload.chatId),
          );
          return;
        }
        invalidate();
      };
      const onUpdated = (chat: ChatSummary) => {
        queryClient.setQueryData<ChatSummary[]>(chatKeys.list(), (prev) =>
          prev?.map((item) => (item.id === chat.id ? chat : item)),
        );
      };

      socket.on('message:new', onNew);
      socket.on('chat:new', onChatNew);
      socket.on('chat:member:added', invalidate);
      socket.on('chat:members:changed', invalidate);
      socket.on('member:removed', onRemoved);
      socket.on('chat:updated', onUpdated);

      cleanup = () => {
        socket.off('message:new', onNew);
        socket.off('chat:new', onChatNew);
        socket.off('chat:member:added', invalidate);
        socket.off('chat:members:changed', invalidate);
        socket.off('member:removed', onRemoved);
        socket.off('chat:updated', onUpdated);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [queryClient, currentUserId]);

  return query;
}
