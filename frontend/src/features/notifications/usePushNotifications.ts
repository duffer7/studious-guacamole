import { useCallback, useEffect, useState } from 'react';
import { areAlertsEnabled } from '@features/notifications/browserNotification';
import {
  disablePush,
  enablePush,
  getPushPermission,
  isNotificationSupported,
  syncSubscription,
} from '@features/notifications/push';

export type PushUiStatus = 'loading' | 'unsupported' | 'denied' | 'prompt' | 'subscribed' | 'error';

export function usePushNotifications() {
  const [status, setStatus] = useState<PushUiStatus>('loading');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const permission = await getPushPermission();
    if (permission === 'unsupported') {
      setStatus('unsupported');
      return;
    }
    if (permission === 'denied') {
      setStatus('denied');
      return;
    }
    if (permission === 'granted' && areAlertsEnabled()) {
      setStatus('subscribed');
      return;
    }
    setStatus('prompt');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const result = await enablePush();
      if (result === 'granted') setStatus('subscribed');
      else if (result === 'denied') setStatus('denied');
      else setStatus('unsupported');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await disablePush();
      setStatus(isNotificationSupported() ? 'prompt' : 'unsupported');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const registration = await navigator.serviceWorker.getRegistration('/');
    const title = 'Тестовое уведомление';
    const options = { body: 'Так выглядит уведомление Guacamole', tag: 'test' };
    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      return;
    }
    try {
      new Notification(title, options);
    } catch {
      // Chrome требует showNotification, если страница под контролем SW
    }
  }, []);

  return { status, busy, enable, disable, sendTest, sync: syncSubscription, refresh };
}
