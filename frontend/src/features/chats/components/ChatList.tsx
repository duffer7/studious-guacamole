import { Fragment } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import type { ChatSummary, PublicUser } from '@features/chats/types';
import { mediaUrl } from '@/lib/mediaUrl';

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

/** Собеседник/собеседники для аватара. */
export function chatAvatarUser(chat: ChatSummary, currentUserId: number): PublicUser | undefined {
  if (chat.type === 'direct') {
    return chat.members.find((m) => m.id !== currentUserId);
  }
  return chat.members[0];
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
      {chats.map((chat, index) => {
        const peer = chatAvatarUser(chat, currentUserId);
        const isActive = chat.id === activeChatId;

        return (
          <Fragment key={chat.id}>
            {index > 0 && <ItemSeparator className="w-full shrink-0" />}
            <Item
              variant={isActive ? 'muted' : 'default'}
              onClick={() => onSelect(chat.id)}
              className={cn(
                'cursor-pointer',
                // сброс border/фона, навешиваемых [a]:hover-стилями Item
                isActive && 'ring-1 ring-ring/20',
              )}
            >
              <ItemMedia>
                <Avatar className="size-10">
                  {peer?.avatarUrl && <AvatarImage src={mediaUrl(peer.avatarUrl)} />}
                  <AvatarFallback>{initialsOf(peer)}</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{chatDisplayName(chat, currentUserId)}</ItemTitle>
                <ItemDescription>
                  {chat.lastMessage?.body ||
                    chat.lastMessage?.attachmentName ||
                    'Нет сообщений'}
                </ItemDescription>
              </ItemContent>
              {chat.unreadCount > 0 && (
                <ItemActions>
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                    {chat.unreadCount}
                  </span>
                </ItemActions>
              )}
            </Item>
          </Fragment>
        );
      })}
    </ItemGroup>
  );
}
