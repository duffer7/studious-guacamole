import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/features/auth/auth.slice';
import { setTokens } from '@/api/client';
import { Button } from '@ui/button';

/** Настройки профиля + выход. Здесь же появится управление MFA. */
export function SettingsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();

  function handleLogout() {
    setTokens({ accessToken: null, refreshToken: null });
    dispatch(logout());
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">Настройки</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Пользователь: {user?.username ?? '—'}
      </p>
      <Button variant="outline" className="mt-4" onClick={handleLogout}>
        Выйти
      </Button>
    </div>
  );
}
