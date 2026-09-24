import { useRef, useState, type ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card';
import { Separator } from '@ui/separator';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { selectUser, setUser } from '@features/auth/auth.slice';
import { AvatarEditor } from '@features/profile/AvatarEditor';
import { deleteAvatar, updateProfile, uploadAvatar } from '@features/profile/api';
import { mediaUrl } from '@/lib/mediaUrl';

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
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium break-all">{value}</span>
    </div>
  );
}

export function MePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.displayName ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-20 pb-10">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const initials = (user.displayName ?? user.username).slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-20 pb-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <button type="button" className="rounded-full" onClick={() => fileRef.current?.click()}>
              <Avatar size="lg">
                {user.avatarUrl ? (
                  <AvatarImage src={mediaUrl(user.avatarUrl)} alt={user.username} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (next) setFile(next);
                event.target.value = '';
              }}
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{user.displayName ?? user.username}</CardTitle>
              <CardDescription className="truncate">@{user.username}</CardDescription>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  Сменить фото
                </Button>
                {user.avatarUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => {
                      setSaving(true);
                      setError(null);
                      void deleteAvatar()
                        .then((next) => dispatch(setUser({ ...user, avatarUrl: next.avatarUrl })))
                        .catch(() => setError('Не удалось удалить аватар'))
                        .finally(() => setSaving(false));
                    }}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <Dialog open={file !== null} onOpenChange={(open) => !open && setFile(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Кадрирование аватара</DialogTitle>
            </DialogHeader>
            {file && (
              <AvatarEditor
                file={file}
                saving={saving}
                onCancel={() => setFile(null)}
                onSave={(image) => {
                  setSaving(true);
                  setError(null);
                  void uploadAvatar(image)
                    .then((next) => {
                      dispatch(setUser({ ...user, avatarUrl: next.avatarUrl }));
                      setFile(null);
                    })
                    .catch(() => setError('Не удалось загрузить аватар'))
                    .finally(() => setSaving(false));
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        <CardContent>
          <Separator />
          <div className="divide-y">
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-muted-foreground">Имя</span>
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSaving(true);
                  setError(null);
                  void updateProfile(name)
                    .then((next) => dispatch(setUser({ ...user, displayName: next.displayName })))
                    .catch(() => setError('Не удалось сохранить имя'))
                    .finally(() => setSaving(false));
                }}
              >
                <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
                <Button type="submit" size="sm" disabled={saving}>
                  Сохранить
                </Button>
              </form>
            </div>
            {error && <p className="py-1 text-sm text-destructive">{error}</p>}
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
