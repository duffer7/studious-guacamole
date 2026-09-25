import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDirectChat, createGroupChat } from '@features/chats/api';
import { chatKeys } from '@features/chats/queryKeys';

/** Создание личного чата с выбранным пользователем. */
export function useCreateDirectChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: number) => createDirectChat({ targetUserId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
  });
}

/** Создание группового чата. */
export function useCreateGroupChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { title: string; targetUserIds: number[] }) => createGroupChat(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
  });
}
