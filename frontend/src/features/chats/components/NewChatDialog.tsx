import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { PlusIcon } from 'lucide-react';
import { useUserSearch } from '@features/chats/hooks/useUserSearch';
import { useCreateDirectChat } from '@features/chats/hooks/useCreateChat';
import type { PublicUser } from '@features/chats/types';
import { mediaUrl } from '@/lib/mediaUrl';

interface NewChatDialogProps {
  onCreated: (chatId: number) => void;
}

function initialsOf(user: PublicUser): string {
  const source = user.displayName || user.username;
  return source.slice(0, 2).toUpperCase();
}

function userLabel(user: PublicUser): string {
  return user.displayName || user.username;
}

export function NewChatDialog({ onCreated }: NewChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: users, isFetching } = useUserSearch(query);
  const createChat = useCreateDirectChat();

  async function handleSelect(user: PublicUser) {
    const chat = await createChat.mutateAsync(user.id);
    setOpen(false);
    setQuery('');
    onCreated(chat.id);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        Новый чат
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-1/4 translate-y-0 overflow-visible p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Новый чат</DialogTitle>
            <DialogDescription>Поиск пользователей</DialogDescription>
          </DialogHeader>

          <Combobox
            items={users ?? []}
            filter={null}
            itemToStringLabel={userLabel}
            onInputValueChange={setQuery}
            onValueChange={(user: PublicUser | null) => {
              if (user) void handleSelect(user);
            }}
          >
            <ComboboxInput
              placeholder="Найти пользователя по имени…"
              showTrigger={false}
              showClear
              autoFocus
            />
            <ComboboxContent>
              {isFetching && (
                <div className="flex items-center justify-center py-6">
                  <Spinner />
                </div>
              )}
              <ComboboxEmpty>
                {query.trim().length < 2 ? 'Введите минимум 2 символа' : 'Никого не найдено'}
              </ComboboxEmpty>
              <ComboboxList>
                {(user: PublicUser) => (
                  <ComboboxItem key={user.id} value={user} className="gap-2">
                    <Avatar className="size-6">
                      {user.avatarUrl && <AvatarImage src={mediaUrl(user.avatarUrl)} />}
                      <AvatarFallback className="text-xs">{initialsOf(user)}</AvatarFallback>
                    </Avatar>
                    <span>{userLabel(user)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">@{user.username}</span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </DialogContent>
      </Dialog>
    </>
  );
}
