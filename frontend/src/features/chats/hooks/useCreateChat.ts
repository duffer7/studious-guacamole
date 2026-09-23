import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDirectChat } from '@features/chats/api';
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
