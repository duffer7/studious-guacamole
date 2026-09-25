export type {
  ChatMember,
  ChatRole,
  ChatSummary,
  ChatType,
  Message,
  MessageHistory,
  PendingMessage,
  PublicUser,
} from '@features/chats/types';

export * as chatsApi from '@features/chats/api';
export { chatKeys } from '@features/chats/queryKeys';
export { useChats } from '@features/chats/hooks/useChats';
export { useMessages } from '@features/chats/hooks/useMessages';
export { useSendMessage } from '@features/chats/hooks/useSendMessage';
export { useMarkRead } from '@features/chats/hooks/useMarkRead';
export {
  useCreateDirectChat,
  useCreateGroupChat,
} from '@features/chats/hooks/useCreateChat';
export {
  useAddMembers,
  useLeaveChat,
  useRemoveMember,
  useUpdateChat,
} from '@features/chats/hooks/useChatMembers';
export {
  connectSocket,
  disconnectSocket,
  getSocket,
  type ChatSocket,
} from '@features/chats/socket';
