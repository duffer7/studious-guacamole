import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/features/auth/auth.slice';
import { setTokens } from '@/api/client';
import { Button } from '@ui/button';
import { Link } from '@tanstack/react-router';
import { Field, FieldGroup } from '@components/ui/field';

/** Настройки профиля + выход. Здесь же появится управление MFA. */
export function SettingsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();

  function handleLogout() {
    setTokens({ accessToken: null, refreshToken: null });
    dispatch(logout());
  }

  function handleLogoutAllDevices() {
    setTokens({ accessToken: null, refreshToken: null });
    dispatch(logout());
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">Настройки</h1>
      <p className="mt-2 text-sm text-muted-foreground">Пользователь: {user?.username ?? '—'}</p>
      <Link to="/me" className="mt-2 inline-block text-sm text-primary hover:underline">
        Profile
      </Link>
      <FieldGroup>
        <Field orientation="horizontal">
          <Button variant="destructive" className="mt-4" onClick={handleLogout}>
            Logout
          </Button>
          <Button variant="destructive" className="mt-4" onClick={handleLogoutAllDevices}>
            Logout from all devices
          </Button>
        </Field>
      </FieldGroup>
    </div>
  );
}
