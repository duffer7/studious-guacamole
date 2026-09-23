import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Spinner } from '@components/ui/spinner';
import { useChats } from '@features/chats/hooks/useChats';
import { ChatList } from '@features/chats/components/ChatList';
import { ChatWindow } from '@features/chats/components/ChatWindow';
import { NewChatDialog } from '@features/chats/components/NewChatDialog';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@features/auth/auth.slice';
import { cn } from 'cn';

export function ChatsPage() {
  const user = useAppSelector(selectUser);
  const { data: chats, isLoading } = useChats();
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  const currentUserId = user?.id;
  const activeChat = chats?.find((c) => c.id === activeChatId) ?? null;

  // пока не известен id текущего пользователя, не рендерим чаты:
  // иначе имена собеседников/«свои» сообщения определяются по чужому id
  if (currentUserId === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 pb-24">
      <Card className="h-[calc(100dvh-8rem)] overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Chats</CardTitle>
          <NewChatDialog onCreated={setActiveChatId} />
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
          <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[20rem_1fr]">
            {/* Список чатов */}
            <div
              className={cn(
                'min-h-0 overflow-y-auto border-border p-2 md:border-r',
                activeChat && 'hidden md:block',
              )}
            >
              <ChatList
                chats={chats ?? []}
                currentUserId={currentUserId}
                activeChatId={activeChatId}
                isLoading={isLoading}
                onSelect={setActiveChatId}
              />
            </div>

            {/* Окно переписки */}
            <div className={cn('min-h-0 min-w-0', !activeChat && 'hidden md:block')}>
              {activeChat ? (
                <ChatWindow chat={activeChat} currentUserId={currentUserId} />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  Выберите чат, чтобы начать переписку
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
