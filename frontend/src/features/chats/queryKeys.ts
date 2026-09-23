export const chatKeys = {
  all: ['chats'] as const,
  list: () => [...chatKeys.all, 'list'] as const,
  detail: (chatId: number) => [...chatKeys.all, 'detail', chatId] as const,
  members: (chatId: number) => [...chatKeys.all, 'members', chatId] as const,
  messages: (chatId: number) => [...chatKeys.all, 'messages', chatId] as const,
};
