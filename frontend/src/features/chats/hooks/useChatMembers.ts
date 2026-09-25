import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addMembers, leaveChat, removeMember, updateChat } from '@features/chats/api';
import { chatKeys } from '@features/chats/queryKeys';
import type { ChatSummary } from '@features/chats/types';

function useInvalidateChat(chatId: number) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    void queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    void queryClient.invalidateQueries({ queryKey: chatKeys.members(chatId) });
  };
}

export function useAddMembers(chatId: number) {
  const invalidate = useInvalidateChat(chatId);

  return useMutation({
    mutationFn: (targetUserIds: number[]) => addMembers(chatId, { targetUserIds }),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(chatId: number) {
  const invalidate = useInvalidateChat(chatId);

  return useMutation({
    mutationFn: (userId: number) => removeMember(chatId, userId),
    onSuccess: invalidate,
  });
}

export function useLeaveChat(chatId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => leaveChat(chatId),
    onSuccess: () => {
      queryClient.setQueryData<ChatSummary[]>(chatKeys.list(), (prev) =>
        prev?.filter((chat) => chat.id !== chatId),
      );
    },
  });
}

export function useUpdateChat(chatId: number) {
  const invalidate = useInvalidateChat(chatId);

  return useMutation({
    mutationFn: (title: string) => updateChat(chatId, { title }),
    onSuccess: invalidate,
  });
}
