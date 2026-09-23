import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
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
import { SendIcon } from 'lucide-react';
import { useMessages } from '@features/chats/hooks/useMessages';
import { useSendMessage } from '@features/chats/hooks/useSendMessage';
import { useMarkRead } from '@features/chats/hooks/useMarkRead';
import { MessageBubble } from '@features/chats/components/MessageBubble';
import type { ChatSummary, PublicUser } from '@features/chats/types';
import { chatDisplayName } from '@features/chats/components/ChatList';

interface ChatWindowProps {
  chat: ChatSummary;
  currentUserId: number;
}

export function ChatWindow({ chat, currentUserId }: ChatWindowProps) {
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
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="text-base font-medium">{chatDisplayName(chat, currentUserId)}</h2>
        </header>

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

/**
 * Список сообщений. Рендерится внутри `MessageScrollerProvider`,
 * чтобы иметь доступ к скроллеру через `useMessageScroller`.
 */
function MessageList({ chat, currentUserId, shouldMarkRead }: MessageListProps) {
  const { messages, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMessages(chat.id);
  const markRead = useMarkRead();
  const { scrollToEnd } = useMessageScroller();

  const membersById = useMemo(() => {
    const map = new Map<number, PublicUser>();
    for (const m of chat.members) map.set(m.id, m);
    return map;
  }, [chat.members]);

  // id последнего сообщения, о прочтении которого уже сообщили серверу
  const lastReadIdRef = useRef(0);

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

  // при появлении новых сообщений прокручиваем к концу
  useEffect(() => {
    if (messages.length === 0) return;
    scrollToEnd({ behavior: 'smooth' });
    // реакция именно на количество сообщений (scrollToEnd стабилен)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, messages.length]);

  const hasMessages = messages.length > 0;

  return (
    <MessageScroller className="min-h-0 flex-1">
      <MessageScrollerViewport className="flex flex-col p-4">
        <MessageScrollerContent className="mt-auto shrink-0 gap-3">
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
            <MessageScrollerItem
              key={message.clientMessageId}
              messageId={message.clientMessageId}
              scrollAnchor={index === messages.length - 1}
            >
              <MessageBubble
                message={message}
                isOwn={message.senderId === currentUserId}
                sender={membersById.get(message.senderId)}
              />
            </MessageScrollerItem>
          ))}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  );
}

interface MessageComposerProps {
  chat: ChatSummary;
  currentUserId: number;
  onFocusChange: (focused: boolean) => void;
}

function MessageComposer({ chat, currentUserId, onFocusChange }: MessageComposerProps) {
  const [text, setText] = useState('');
  const sendMessage = useSendMessage();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;

    setText('');
    void sendMessage({ chatId: chat.id, body, senderId: currentUserId });
    // возвращаем фокус, чтобы можно было печатать дальше без клика
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
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
