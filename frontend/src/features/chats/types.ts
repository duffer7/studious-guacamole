/** Публичное представление пользователя (совпадает с backend PublicUserDto). */
export interface PublicUser {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export type ChatType = 'direct' | 'group' | 'channel';

/** Сообщение (совпадает с backend MessageDto). */
export interface Message {
  id: number;
  chatId: number;
  senderId: number;
  body: string | null;
  type: string;
  clientMessageId: string;
  replyToId: number | null;
  createdAt: string;
  attachmentKey?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
}

/** Сводка чата (совпадает с backend ChatSummaryDto). */
export interface ChatSummary {
  id: number;
  type: ChatType;
  title: string | null;
  unreadCount: number;
  lastMessage: Message | null;
  members: PublicUser[];
}

/** Ответ истории сообщений (cursor-пагинация). */
export interface MessageHistory {
  items: Message[];
  hasMore: boolean;
  nextCursor: number | null;
}

export interface CreateDirectChatDto {
  targetUserId: number;
}

export interface CreateGroupChatDto {
  title: string;
  targetUserIds: number[];
}

/** Локальное оптимистичное сообщение (ещё не подтверждённое сервером). */
export interface PendingMessage extends Message {
  pending: true;
}
