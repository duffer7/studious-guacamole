import type * as React from 'react';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card';
import { Separator } from '@ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/avatar';
import { selectUser } from '@features/auth/auth.slice';

function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

/** Строка "ключ — значение" для карточки профиля. */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium break-all">{value}</span>
    </div>
  );
}

export function MePage() {
  const user = useAppSelector(selectUser);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const initials = (user.displayName ?? user.username).slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarImage src="{user.avatarUrl}" alt="{user.username}" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="truncate">{user.displayName ?? user.username}</CardTitle>
              <CardDescription className="truncate">@{user.username}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Separator />
          <div className="divide-y">
            <InfoRow label="Имя" value={user.displayName ?? '—'} />
            <InfoRow label="Логин" value={user.username} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow
              label="Двухфакторная аутентификация"
              value={
                <span
                  className={
                    user.mfaEnabled
                      ? 'inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'
                  }
                >
                  <span
                    aria-hidden
                    className={
                      'size-2 rounded-full ' +
                      (user.mfaEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/50')
                    }
                  />
                  {user.mfaEnabled ? 'Включена' : 'Выключена'}
                </span>
              }
            />
            <InfoRow label="Аккаунт создан" value={formatDate(user.createdAt)} />
            <InfoRow label="Последнее обновление" value={formatDate(user.updatedAt)} />
            <InfoRow label="ID пользователя" value={String(user.id)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
