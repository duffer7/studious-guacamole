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
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusIcon, XIcon } from 'lucide-react';
import { useUserSearch } from '@features/chats/hooks/useUserSearch';
import { useCreateDirectChat, useCreateGroupChat } from '@features/chats/hooks/useCreateChat';
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
  const [mode, setMode] = useState('direct');
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<PublicUser[]>([]);

  const { data: users, isFetching } = useUserSearch(query);
  const createDirect = useCreateDirectChat();
  const createGroup = useCreateGroupChat();

  function reset() {
    setQuery('');
    setTitle('');
    setSelected([]);
    setMode('direct');
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function handleSelectDirect(user: PublicUser) {
    const chat = await createDirect.mutateAsync(user.id);
    close();
    onCreated(chat.id);
  }

  function toggleMember(user: PublicUser) {
    setSelected((prev) =>
      prev.some((item) => item.id === user.id)
        ? prev.filter((item) => item.id !== user.id)
        : [...prev, user],
    );
    setQuery('');
  }

  async function handleCreateGroup() {
    const trimmed = title.trim();
    if (!trimmed || selected.length === 0) return;
    const chat = await createGroup.mutateAsync({
      title: trimmed,
      targetUserIds: selected.map((user) => user.id),
    });
    close();
    onCreated(chat.id);
  }

  const canCreateGroup = title.trim().length > 0 && selected.length > 0 && !createGroup.isPending;
  const visibleUsers = (users ?? []).filter((user) => !selected.some((item) => item.id === user.id));

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        Новый чат
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="top-1/4 translate-y-0 overflow-visible p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Новый чат</DialogTitle>
            <DialogDescription>Личное сообщение или группа</DialogDescription>
          </DialogHeader>

          <Tabs value={mode} onValueChange={setMode} className="px-4 pb-4">
            <TabsList>
              <TabsTrigger value="direct">Личный</TabsTrigger>
              <TabsTrigger value="group">Группа</TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="pt-3">
              <UserPicker
                users={users ?? []}
                isFetching={isFetching}
                query={query}
                onQueryChange={setQuery}
                onSelect={(user) => void handleSelectDirect(user)}
              />
            </TabsContent>

            <TabsContent value="group" className="flex flex-col gap-3 pt-3">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Название группы"
                maxLength={128}
              />
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                      onClick={() => toggleMember(user)}
                    >
                      {userLabel(user)}
                      <XIcon className="size-3" />
                    </button>
                  ))}
                </div>
              )}
              <UserPicker
                users={visibleUsers}
                isFetching={isFetching}
                query={query}
                onQueryChange={setQuery}
                onSelect={toggleMember}
              />
              <Button disabled={!canCreateGroup} onClick={() => void handleCreateGroup()}>
                {createGroup.isPending ? <Spinner /> : 'Создать'}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface UserPickerProps {
  users: PublicUser[];
  isFetching: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (user: PublicUser) => void;
}

function UserPicker({ users, isFetching, query, onQueryChange, onSelect }: UserPickerProps) {
  return (
    <Combobox
      items={users}
      filter={null}
      itemToStringLabel={userLabel}
      onInputValueChange={onQueryChange}
      onValueChange={(user: PublicUser | null) => {
        if (user) onSelect(user);
      }}
    >
      <ComboboxInput
        placeholder="Найти пользователя по логину…"
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
  );
}
