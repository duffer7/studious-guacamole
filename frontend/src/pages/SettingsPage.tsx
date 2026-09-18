import { useAppSelector } from '@/store/hooks';
import { useLogout } from '@features/auth/hooks/useLogout';
import { Button } from '@ui/button';
import { Link } from '@tanstack/react-router';
import { Field, FieldGroup } from '@components/ui/field';

export function SettingsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const { logout, logoutAll } = useLogout();
  function handleLogout() {
    void logout();
  }

  function handleLogoutAllDevices() {
    void logoutAll();
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
