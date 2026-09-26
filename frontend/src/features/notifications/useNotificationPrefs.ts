import { useCallback, useState } from 'react';
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from '@features/notifications/notificationPrefs';
import { sound } from '@features/notifications/sound';

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadNotificationPrefs());

  const update = useCallback((patch: Partial<NotificationPrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      saveNotificationPrefs(next);
      sound.setEnabled(next);
      return next;
    });
  }, []);

  return { prefs, update };
}
