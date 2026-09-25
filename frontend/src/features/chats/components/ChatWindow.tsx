import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from '@/components/ui/message-scroller';
import { ArrowLeftIcon, PaperclipIcon, SendIcon, UsersIcon, VideoIcon } from 'lucide-react';
import { uploadAttachment } from '@features/chats/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatarWithPresence } from '@features/chats/components/UserAvatarWithPresence';
import { formatLastSeen } from '@features/chats/presence/formatLastSeen';
import { usePresence } from '@features/chats/presence/usePresence';
import { useAppSelector } from '@/store/hooks';
import { useCall } from '@features/calls/CallProvider';
import { chatAvatarUser, chatDisplayName, chatSubtitle, groupInitials } from '@features/chats/components/ChatList';
import { ChatMembersPanel } from '@features/chats/components/ChatMembersPanel';
import { useMessages } from '@features/chats/hooks/useMessages';
import { useSendMessage } from '@features/chats/hooks/useSendMessage';
import { useMarkRead } from '@features/chats/hooks/useMarkRead';
import { MessageBubble } from '@features/chats/components/MessageBubble';
import type { ChatSummary, Message, PublicUser } from '@features/chats/types';

interface ChatWindowProps {
  chat: ChatSummary;
  currentUserId: number;
  onBack?: () => void;
}

export function ChatWindow({ chat, currentUserId, onBack }: ChatWindowProps) {
  const call = useCall();
  const peer = chatAvatarUser(chat, currentUserId);
  const peerPresence = usePresence(peer?.id, peer);
  const presenceByUser = useAppSelector((state) => state.presence.byUserId);
  const onlineCount = chat.members.filter((member) => {
    const live = presenceByUser[member.id];
    return (live?.online ?? member.online) === true;
  }).length;
  const initials =
    chat.type === 'direct'
      ? (peer?.displayName || peer?.username || '?').slice(0, 2).toUpperCase()
      : groupInitials(chat);
  const subtitle =
    chat.type === 'direct'
      ? formatLastSeen(peerPresence.lastSeenAt, peerPresence.online)
      : `${onlineCount} из ${chat.memberCount} онлайн`;
  const [membersOpen, setMembersOpen] = useState(false);
  // сообщения считаем прочитанными, только если пользователь реально смотрит на чат:
  // вкладка активна ИЛИ поле ввода в фокусе (например, во время печати)
  const [inputFocused, setInputFocused] = useState(false);
  const [windowFocused, setWindowFocused] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  );

  useEffect(() => {
    const onVisibility = () => setWindowFocused(document.visibilityState === 'visible');
    const onFocus = () => setWindowFocused(true);
    const onBlur = () => setWindowFocused(false);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border/70 px-3 py-2.5">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onBack}
              aria-label="К списку чатов"
            >
              <ArrowLeftIcon />
            </Button>
          )}
          {chat.type === 'direct' && peer ? (
            <UserAvatarWithPresence
              userId={peer.id}
              avatarUrl={peer.avatarUrl}
              fallback={initials}
              className="size-9"
              online={peer.online}
              lastSeenAt={peer.lastSeenAt}
            />
          ) : (
            <Avatar className="size-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">
              {chatDisplayName(chat, currentUserId)}
            </h2>
            <p className="text-xs text-muted-foreground">{subtitle || chatSubtitle(chat)}</p>
          </div>
          {chat.type === 'direct' && peer && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Видеозвонок"
              disabled={call.phase !== 'idle'}
              onClick={() => call.startCall(chat, peer)}
            >
              <VideoIcon />
            </Button>
          )}
          {chat.type === 'group' && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Участники"
              onClick={() => setMembersOpen(true)}
            >
              <UsersIcon />
            </Button>
          )}
        </header>

        {chat.type === 'group' && (
          <ChatMembersPanel
            chat={chat}
            currentUserId={currentUserId}
            open={membersOpen}
            onOpenChange={setMembersOpen}
            onLeft={() => onBack?.()}
          />
        )}

        <MessageList
          chat={chat}
          currentUserId={currentUserId}
          shouldMarkRead={windowFocused || inputFocused}
        />

        <MessageComposer
          chat={chat}
          currentUserId={currentUserId}
          onFocusChange={setInputFocused}
        />
      </div>
    </MessageScrollerProvider>
  );
}

interface MessageListProps {
  chat: ChatSummary;
  currentUserId: number;
  shouldMarkRead: boolean;
}

/** Сколько держать полоску после того, как низ ленты уже на экране. */
const UNREAD_DIVIDER_HIDE_MS = 2500;

interface UnreadMarker {
  chatId: number;
  /** id последнего прочитанного на момент открытия; null — не читали ничего. */
  boundary: number | null;
  unreadCount: number;
  visible: boolean;
}

function captureUnreadMarker(chat: ChatSummary): UnreadMarker {
  return {
    chatId: chat.id,
    boundary: chat.lastReadMessageId ?? null,
    unreadCount: chat.unreadCount,
    visible: chat.unreadCount > 0,
  };
}

function findFirstUnreadIndex(
  messages: Message[],
  marker: UnreadMarker,
  currentUserId: number,
): number {
  if (!marker.visible || marker.unreadCount <= 0) return -1;

  const boundary = marker.boundary;
  if (boundary !== null) {
    return messages.findIndex(
      (message) =>
        message.id > 0 && message.senderId !== currentUserId && message.id > boundary,
    );
  }

  let remaining = marker.unreadCount;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.id <= 0 || message.senderId === currentUserId) continue;
    remaining -= 1;
    if (remaining === 0) return index;
  }
  return messages.findIndex(
    (message) => message.id > 0 && message.senderId !== currentUserId,
  );
}

/**
 * Список сообщений. Рендерится внутри `MessageScrollerProvider`,
 * чтобы иметь доступ к скроллеру через `useMessageScroller`.
 */
function MessageList({ chat, currentUserId, shouldMarkRead }: MessageListProps) {
  const { messages, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMessages(chat.id);
  const markRead = useMarkRead();
  const { scrollToEnd } = useMessageScroller();
  const viewportRef = useRef<HTMLDivElement>(null);

  const membersById = useMemo(() => {
    const map = new Map<number, PublicUser>();
    for (const m of chat.members) map.set(m.id, m);
    return map;
  }, [chat.members]);

  // граница непрочитанных фиксируется в момент открытия чата и не сдвигается,
  // когда список чатов оптимистично обнуляет unreadCount
  const [unreadMarker, setUnreadMarker] = useState<UnreadMarker>(() =>
    captureUnreadMarker(chat),
  );
  if (unreadMarker.chatId !== chat.id) {
    setUnreadMarker(captureUnreadMarker(chat));
  }

  // id последнего сообщения, о прочтении которого уже сообщили серверу
  const lastReadIdRef = useRef(0);
  const seenChatIdRef = useRef(chat.id);
  if (seenChatIdRef.current !== chat.id) {
    seenChatIdRef.current = chat.id;
    lastReadIdRef.current = 0;
  }

  const lastMessage = messages[messages.length - 1];
  const lastMessageId = lastMessage?.id ?? 0;
  // у оптимистичных сообщений id отрицательный, у подтверждённых сервером — положительный
  const isServerMessage = lastMessageId > 0;

  // отмечаем прочитанным новое серверное сообщение не от нас и только если
  // пользователь смотрит на чат (вкладка/окно активно или поле ввода в фокусе)
  useEffect(() => {
    if (!shouldMarkRead) return;
    if (!isServerMessage || !lastMessage) return;
    if (lastMessage.senderId === currentUserId) return;
    if (lastMessageId <= lastReadIdRef.current) return;

    lastReadIdRef.current = lastMessageId;
    void markRead(chat.id, lastMessageId);
    // markRead стабилен (useCallback); эффект реагирует на новое сообщение/смену фокуса
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, currentUserId, shouldMarkRead, isServerMessage, lastMessageId]);

  const firstUnreadIndex = findFirstUnreadIndex(messages, unreadMarker, currentUserId);
  const lastMessageKey = lastMessage?.clientMessageId ?? '';

  // полоска остаётся, пока низ ленты не показан, затем уходит
  useEffect(() => {
    if (!shouldMarkRead || !unreadMarker.visible || firstUnreadIndex < 0) return;

    const timer = window.setTimeout(() => {
      setUnreadMarker((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    }, UNREAD_DIVIDER_HIDE_MS);

    return () => window.clearTimeout(timer);
  }, [shouldMarkRead, unreadMarker.visible, unreadMarker.chatId, firstUnreadIndex]);

  // Библиотечный scrollToEnd срабатывает до финальной высоты списка и оставляет
  // несколько сообщений ниже экрана. Дожимаем scrollTop, пока высота устаканится.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || messages.length === 0) return;

    const pin = () => {
      viewport.scrollTop = viewport.scrollHeight;
    };

    scrollToEnd({ behavior: 'instant' });
    pin();

    const observer = new ResizeObserver(pin);
    const content = viewport.firstElementChild;
    if (content) observer.observe(content);

    const stop = window.setTimeout(() => observer.disconnect(), 500);
    return () => {
      observer.disconnect();
      window.clearTimeout(stop);
    };
  }, [chat.id, lastMessageKey, scrollToEnd, messages.length]);

  const hasMessages = messages.length > 0;

  return (
    <MessageScroller className="min-h-0 flex-1">
      <MessageScrollerViewport ref={viewportRef} className="flex flex-col px-4 pt-4">
        <MessageScrollerContent className="mt-auto min-h-0 gap-3">
          {hasNextPage && (
            <div className="flex justify-center pb-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? <Spinner /> : 'Загрузить ещё'}
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="ml-auto h-8 w-56" />
              <Skeleton className="h-8 w-40" />
            </div>
          )}

          {isError && (
            <p className="text-center text-sm text-destructive">Не удалось загрузить сообщения</p>
          )}

          {!isLoading && !isError && !hasMessages && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Сообщений пока нет</EmptyTitle>
                <EmptyDescription>Напишите первое сообщение в этом чате.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {messages.map((message, index) => (
            <Fragment key={message.clientMessageId}>
              {index === firstUnreadIndex && (
                <MessageScrollerItem messageId={`unread-divider-${chat.id}`}>
                  <UnreadDivider />
                </MessageScrollerItem>
              )}
              <MessageScrollerItem messageId={message.clientMessageId}>
                <MessageBubble
                  message={message}
                  isOwn={message.senderId === currentUserId}
                  sender={membersById.get(message.senderId)}
                />
              </MessageScrollerItem>
            </Fragment>
          ))}
          {hasMessages && <div aria-hidden className="h-3 shrink-0 -mt-3" />}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  );
}

function UnreadDivider() {
  return (
    <div
      className="flex items-center gap-3 py-1"
      role="separator"
      aria-label="Непрочитанные сообщения"
    >
      <div className="h-px flex-1 bg-primary/50" />
      <span className="shrink-0 text-xs font-medium text-primary">Непрочитанные сообщения</span>
      <div className="h-px flex-1 bg-primary/50" />
    </div>
  );
}

interface MessageComposerProps {
  chat: ChatSummary;
  currentUserId: number;
  onFocusChange: (focused: boolean) => void;
}

function MessageComposer({ chat, currentUserId, onFocusChange }: MessageComposerProps) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const sendMessage = useSendMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;

    setText('');
    void sendMessage({ chatId: chat.id, body, senderId: currentUserId });
    inputRef.current?.focus();
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const data = result.slice(result.indexOf(',') + 1);
      void uploadAttachment(chat.id, {
        name: file.name,
        mime: file.type || 'application/octet-stream',
        data,
      })
        .then((attachment) =>
          sendMessage({
            chatId: chat.id,
            body: text.trim() || undefined,
            senderId: currentUserId,
            attachment,
          }),
        )
        .then(() => setText(''))
        .finally(() => setUploading(false));
    };
    reader.readAsDataURL(file);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border/70 p-3">
      <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={uploading}
        aria-label="Прикрепить файл"
        onClick={() => fileRef.current?.click()}
      >
        <PaperclipIcon />
      </Button>
      <Input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        placeholder="Введите сообщение…"
        aria-label="Текст сообщения"
        autoComplete="off"
      />
      <Button type="submit" size="icon" disabled={!text.trim()}>
        <SendIcon />
      </Button>
    </form>
  );
}
