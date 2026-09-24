import { request } from '@/api/client';
import type {
  ChatSummary,
  CreateDirectChatDto,
  CreateGroupChatDto,
  MessageHistory,
  PublicUser,
} from '@features/chats/types';

/** GET /chats — список чатов текущего пользователя. */
export function listChats(): Promise<ChatSummary[]> {
  return request<ChatSummary[]>('/chats');
}

/** GET /chats/:id — информация о чате. */
export function getChat(chatId: number): Promise<ChatSummary> {
  return request<ChatSummary>(`/chats/${chatId}`);
}

/** GET /chats/:id/messages — история сообщений (cursor-пагинация). */
export function getHistory(
  chatId: number,
  params: { before?: number; limit?: number } = {},
): Promise<MessageHistory> {
  const search = new URLSearchParams();
  if (params.before) search.set('before', String(params.before));
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString();

  return request<MessageHistory>(`/chats/${chatId}/messages${qs ? `?${qs}` : ''}`);
}

/** GET /chats/:id/members — участники чата. */
export function getMembers(chatId: number): Promise<PublicUser[]> {
  return request<PublicUser[]>(`/chats/${chatId}/members`);
}

export interface UploadedAttachment {
  key: string;
  name: string;
  mime: string;
  size: number;
}

/** POST /chats/:id/files — загрузить вложение в MinIO. */
export function uploadAttachment(
  chatId: number,
  file: { name: string; mime: string; data: string },
): Promise<UploadedAttachment> {
  return request<UploadedAttachment>(`/chats/${chatId}/files`, { method: 'POST', body: file });
}

/** POST /chats/direct — создать личный чат. */
export function createDirectChat(dto: CreateDirectChatDto): Promise<ChatSummary> {
  return request<ChatSummary>('/chats/direct', { method: 'POST', body: dto });
}

/** POST /chats/group — создать групповой чат. */
export function createGroupChat(dto: CreateGroupChatDto): Promise<ChatSummary> {
  return request<ChatSummary>('/chats/group', { method: 'POST', body: dto });
}

/** POST /chats/:id/read — отметить чат прочитанным до messageId. */
export function markRead(chatId: number, upToId: number): Promise<void> {
  return request<void>(`/chats/${chatId}/read`, { method: 'POST', body: { upToId } });
}

/** GET /users/search — поиск пользователей по username/displayName. */
export function searchUsers(query: string): Promise<PublicUser[]> {
  return request<PublicUser[]>(`/users/search?query=${encodeURIComponent(query)}`);
}
