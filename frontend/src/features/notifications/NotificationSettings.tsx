import { Button } from '@ui/button';
import { Switch } from '@ui/switch';
import { useNotificationPrefs } from '@features/notifications/useNotificationPrefs';
import { usePushNotifications } from '@features/notifications/usePushNotifications';

function unsupportedHint(): string {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    return 'На iPhone уведомления работают только у установленного приложения на домашнем экране.';
  }
  if (!window.isSecureContext) {
    return 'Уведомления нужны HTTPS. Откройте сайт по защищённому адресу, не по http://.';
  }
  return 'Этот браузер не умеет показывать уведомления.';
}

export function NotificationSettings() {
  const { prefs, update } = useNotificationPrefs();
  const { status, busy, enable, disable, sendTest } = usePushNotifications();
  const pushOn = status === 'subscribed';

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-medium">Уведомления</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Баннер в браузере, если вкладка свёрнута или открыт другой чат. Push — когда приложение
          закрыто.
        </p>
      </div>

      <label className="flex items-center justify-between gap-4 text-sm">
        <span>Включить уведомления</span>
        <Switch
          checked={pushOn}
          disabled={busy || status === 'unsupported' || status === 'denied' || status === 'loading'}
          onCheckedChange={(checked) => {
            void (checked ? enable() : disable());
          }}
        />
      </label>

      {status === 'unsupported' && <p className="text-sm text-muted-foreground">{unsupportedHint()}</p>}
      {status === 'denied' && (
        <p className="text-sm text-destructive">Разрешите уведомления в настройках браузера.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-destructive">Не удалось обновить подписку. Попробуйте ещё раз.</p>
      )}

      <label className="flex items-center justify-between gap-4 text-sm">
        <span>Звук на новое сообщение</span>
        <Switch
          checked={prefs.messageSound}
          onCheckedChange={(messageSound) => update({ messageSound })}
        />
      </label>

      <label className="flex items-center justify-between gap-4 text-sm">
        <span>Звук на звонок</span>
        <Switch checked={prefs.callSound} onCheckedChange={(callSound) => update({ callSound })} />
      </label>

      <Button type="button" variant="outline" disabled={!pushOn} onClick={() => void sendTest()}>
        Отправить тестовое уведомление
      </Button>
    </section>
  );
}
