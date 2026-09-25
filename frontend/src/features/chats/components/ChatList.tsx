import { Fragment } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatarWithPresence } from '@features/chats/components/UserAvatarWithPresence';
import { formatLastSeen } from '@features/chats/presence/formatLastSeen';
import { usePresence } from '@features/chats/presence/usePresence';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from 'cn';
import type { ChatMember, ChatSummary, PublicUser } from '@features/chats/types';

interface ChatListProps {
  chats: ChatSummary[];
  currentUserId: number;
  activeChatId: number | null;
  isLoading: boolean;
  onSelect: (chatId: number) => void;
}

/** Человекочитаемое имя чата: для direct — имя собеседника, иначе title. */
export function chatDisplayName(chat: ChatSummary, currentUserId: number): string {
  if (chat.type === 'direct') {
    const peer = chat.members.find((m) => m.id !== currentUserId);
    return peer?.displayName || peer?.username || 'Личный чат';
  }
  return chat.title || 'Групповой чат';
}

/** Собеседник для аватара личного чата. */
export function chatAvatarUser(chat: ChatSummary, currentUserId: number): ChatMember | undefined {
  if (chat.type === 'direct') {
    return chat.members.find((m) => m.id !== currentUserId);
  }
  return undefined;
}

export function groupInitials(chat: ChatSummary): string {
  const source = chat.title?.trim() || 'Группа';
  return source.slice(0, 2).toUpperCase();
}

function memberCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} участник`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} участника`;
  return `${count} участников`;
}

export function chatSubtitle(chat: ChatSummary): string {
  if (chat.type === 'direct') return 'Личный чат';
  return memberCountLabel(chat.memberCount ?? chat.members.length);
}

function initialsOf(user: PublicUser | undefined): string {
  const source = user?.displayName || user?.username || '?';
  return source.slice(0, 2).toUpperCase();
}

export function ChatList({
  chats,
  currentUserId,
  activeChatId,
  isLoading,
  onSelect,
}: ChatListProps) {
  if (isLoading) {
    return (
      <ItemGroup className="flex w-full flex-col gap-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Fragment key={i}>
            {i > 0 && <ItemSeparator className="w-full shrink-0" />}
            <Item>
              <ItemMedia>
                <Skeleton className="size-10 rounded-full" />
              </ItemMedia>
              <ItemContent>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </ItemContent>
            </Item>
          </Fragment>
        ))}
      </ItemGroup>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Пока нет чатов
      </div>
    );
  }

  return (
    <ItemGroup className="flex w-full flex-col gap-0">
      {chats.map((chat, index) => (
        <Fragment key={chat.id}>
          {index > 0 && <ItemSeparator className="w-full shrink-0" />}
          <ChatListItem
            chat={chat}
            currentUserId={currentUserId}
            active={chat.id === activeChatId}
            onSelect={onSelect}
          />
        </Fragment>
      ))}
    </ItemGroup>
  );
}

function ChatListItem({
  chat,
  currentUserId,
  active,
  onSelect,
}: {
  chat: ChatSummary;
  currentUserId: number;
  active: boolean;
  onSelect: (chatId: number) => void;
}) {
  const peer = chatAvatarUser(chat, currentUserId);
  const presence = usePresence(peer?.id, peer);
  const lastMessage = chat.lastMessage?.body || chat.lastMessage?.attachmentName;
  const subtitle =
    lastMessage ||
    (chat.type === 'direct' ? formatLastSeen(presence.lastSeenAt, presence.online) : '') ||
    'Нет сообщений';

  return (
    <Item
      variant={active ? 'muted' : 'default'}
      onClick={() => onSelect(chat.id)}
      className={cn('cursor-pointer', active && 'ring-1 ring-ring/20')}
    >
      <ItemMedia>
        {chat.type === 'direct' && peer ? (
          <UserAvatarWithPresence
            userId={peer.id}
            avatarUrl={peer.avatarUrl}
            fallback={initialsOf(peer)}
            className="size-10"
            online={peer.online}
            lastSeenAt={peer.lastSeenAt}
          />
        ) : (
          <Avatar className="size-10">
            <AvatarFallback>{groupInitials(chat)}</AvatarFallback>
          </Avatar>
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{chatDisplayName(chat, currentUserId)}</ItemTitle>
        <ItemDescription>{subtitle}</ItemDescription>
      </ItemContent>
      {chat.unreadCount > 0 && (
        <ItemActions>
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
            {chat.unreadCount}
          </span>
        </ItemActions>
      )}
    </Item>
  );
}
