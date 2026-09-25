import { useState } from 'react';
import { Spinner } from '@components/ui/spinner';
import { useChats } from '@features/chats/hooks/useChats';
import { ChatList } from '@features/chats/components/ChatList';
import { ChatWindow } from '@features/chats/components/ChatWindow';
import { NewChatDialog } from '@features/chats/components/NewChatDialog';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@features/auth/auth.slice';
import { cn } from 'cn';
import { MessageSquareIcon } from 'lucide-react';

export function ChatsPage() {
  const user = useAppSelector(selectUser);
  const { data: chats, isLoading } = useChats();
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  const currentUserId = user?.id;
  const activeChat = chats?.find((c) => c.id === activeChatId) ?? null;

  if (currentUserId === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-6xl flex-col px-3 pt-16 pb-4 sm:px-4">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lg">
        <aside
          className={cn(
            'flex min-h-0 w-full flex-col border-border/70 md:w-80 md:border-r',
            activeChat && 'hidden md:flex',
          )}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Сообщения
              </p>
              <h1 className="text-lg font-semibold">Чаты</h1>
            </div>
            <NewChatDialog onCreated={setActiveChatId} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 pb-2">
            <ChatList
              chats={chats ?? []}
              currentUserId={currentUserId}
              activeChatId={activeChatId}
              isLoading={isLoading}
              onSelect={setActiveChatId}
            />
          </div>
        </aside>

        <section className={cn('min-h-0 min-w-0 flex-1', !activeChat && 'hidden md:block')}>
          {activeChat ? (
            <ChatWindow
              chat={activeChat}
              currentUserId={currentUserId}
              onBack={() => setActiveChatId(null)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <MessageSquareIcon className="size-6" />
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                Выберите чат слева или начните новый, чтобы написать сообщение.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
