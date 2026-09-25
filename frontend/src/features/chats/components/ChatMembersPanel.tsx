import { useEffect, useState } from 'react';
import { UserAvatarWithPresence } from '@features/chats/components/UserAvatarWithPresence';
import { formatLastSeen } from '@features/chats/presence/formatLastSeen';
import { usePresence } from '@features/chats/presence/usePresence';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { Spinner } from '@/components/ui/spinner';
import { useUserSearch } from '@features/chats/hooks/useUserSearch';
import {
  useAddMembers,
  useLeaveChat,
  useRemoveMember,
  useUpdateChat,
} from '@features/chats/hooks/useChatMembers';
import type { ChatMember, ChatSummary, PublicUser } from '@features/chats/types';

interface ChatMembersPanelProps {
  chat: ChatSummary;
  currentUserId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeft: () => void;
}

function userLabel(user: PublicUser): string {
  return user.displayName || user.username;
}

function initialsOf(user: PublicUser): string {
  return (user.displayName || user.username).slice(0, 2).toUpperCase();
}

function MemberRow({
  member,
  canManage,
  currentUserId,
  onRemove,
  removePending,
}: {
  member: ChatMember;
  canManage: boolean;
  currentUserId: number;
  onRemove: () => void;
  removePending: boolean;
}) {
  const presence = usePresence(member.id, member);
  const status = formatLastSeen(presence.lastSeenAt, presence.online);

  return (
    <li className="flex items-center gap-2">
      <UserAvatarWithPresence
        userId={member.id}
        avatarUrl={member.avatarUrl}
        fallback={initialsOf(member)}
        className="size-8"
        online={member.online}
        lastSeenAt={member.lastSeenAt}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{userLabel(member)}</p>
        <p className="text-xs text-muted-foreground">
          {ROLE_LABEL[member.role]}
          {status ? ` · ${status}` : ''}
        </p>
      </div>
      {canManage && member.role !== 'owner' && member.id !== currentUserId && (
        <Button variant="ghost" size="sm" disabled={removePending} onClick={onRemove}>
          Удалить
        </Button>
      )}
    </li>
  );
}

const ROLE_LABEL: Record<ChatMember['role'], string> = {
  owner: 'владелец',
  admin: 'админ',
  member: 'участник',
};

export function ChatMembersPanel({
  chat,
  currentUserId,
  open,
  onOpenChange,
  onLeft,
}: ChatMembersPanelProps) {
  const canManage = chat.myRole === 'owner' || chat.myRole === 'admin';
  const [title, setTitle] = useState(chat.title ?? '');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setTitle(chat.title ?? '');
  }, [chat.title]);

  const { data: users, isFetching } = useUserSearch(adding ? query : '');
  const addMembers = useAddMembers(chat.id);
  const removeMember = useRemoveMember(chat.id);
  const leaveChat = useLeaveChat(chat.id);
  const updateChat = useUpdateChat(chat.id);

  const memberIds = new Set(chat.members.map((member) => member.id));
  const candidates = (users ?? []).filter((user) => !memberIds.has(user.id));

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === chat.title) return;
    await updateChat.mutateAsync(trimmed);
  }

  async function handleAdd(user: PublicUser) {
    await addMembers.mutateAsync([user.id]);
    setQuery('');
    setAdding(false);
  }

  async function handleLeave() {
    const confirmed = window.confirm('Выйти из группы?');
    if (!confirmed) return;
    await leaveChat.mutateAsync();
    onOpenChange(false);
    onLeft();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Участники</DialogTitle>
          <DialogDescription>
            {chat.memberCount} в «{chat.title || 'Групповой чат'}»
          </DialogDescription>
        </DialogHeader>

        {canManage && (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void saveTitle();
            }}
          >
            <Input
              value={title}
              maxLength={128}
              onChange={(event) => setTitle(event.target.value)}
              aria-label="Название группы"
            />
            <Button type="submit" variant="outline" disabled={updateChat.isPending}>
              Сохранить
            </Button>
          </form>
        )}

        <ul className="flex flex-col gap-2">
          {chat.members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              canManage={canManage}
              currentUserId={currentUserId}
              onRemove={() => void removeMember.mutateAsync(member.id)}
              removePending={removeMember.isPending}
            />
          ))}
        </ul>

        {canManage && (
          <div className="flex flex-col gap-2">
            {adding ? (
              <Combobox
                items={candidates}
                filter={null}
                itemToStringLabel={userLabel}
                onInputValueChange={setQuery}
                onValueChange={(user: PublicUser | null) => {
                  if (user) void handleAdd(user);
                }}
              >
                <ComboboxInput placeholder="Добавить участника…" showTrigger={false} showClear />
                <ComboboxContent>
                  {isFetching && (
                    <div className="flex justify-center py-4">
                      <Spinner />
                    </div>
                  )}
                  <ComboboxEmpty>
                    {query.trim().length < 2 ? 'Введите минимум 2 символа' : 'Никого не найдено'}
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(user: PublicUser) => (
                      <ComboboxItem key={user.id} value={user}>
                        {userLabel(user)}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            ) : (
              <Button variant="outline" onClick={() => setAdding(true)}>
                Добавить участника
              </Button>
            )}
          </div>
        )}

        <Button variant="destructive" disabled={leaveChat.isPending} onClick={() => void handleLeave()}>
          Выйти из группы
        </Button>
      </DialogContent>
    </Dialog>
  );
}
