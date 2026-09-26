import { request } from '@/api/client';
import { setAlertsEnabled } from '@features/notifications/browserNotification';

export type EnablePushResult = 'granted' | 'denied' | 'unsupported';

interface PushPublicKeyResponse {
  publicKey: string | null;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isNotificationSupported(): boolean {
  return window.isSecureContext && 'Notification' in window;
}

export function isPushSupported(): boolean {
  return isNotificationSupported() && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function getPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

async function postSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Неполная push-подписка');
  }
  await request('/push/subscribe', {
    method: 'POST',
    body: {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    },
  });
}

export async function syncSubscription(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await ensureServiceWorker();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await postSubscription(subscription);
}

export async function enablePush(): Promise<EnablePushResult> {
  if (!isNotificationSupported()) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  setAlertsEnabled(true);
  await ensureServiceWorker().catch(() => null);

  if (!isPushSupported()) return 'granted';

  try {
    const { publicKey } = await request<PushPublicKeyResponse>('/push/public-key');
    if (!publicKey) return 'granted';

    const registration = await ensureServiceWorker();
    if (!registration) return 'granted';

    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const existing = await registration.pushManager.getSubscription();
    const subscription = await reuseOrResubscribe(registration, existing, applicationServerKey);
    await postSubscription(subscription);
  } catch {
    // Разрешение уже есть — баннеры в открытой вкладке всё равно работают.
  }
  return 'granted';
}

async function reuseOrResubscribe(
  registration: ServiceWorkerRegistration,
  existing: PushSubscription | null,
  applicationServerKey: Uint8Array,
): Promise<PushSubscription> {
  if (existing && sameApplicationServerKey(existing, applicationServerKey)) {
    return existing;
  }
  if (existing) await existing.unsubscribe().catch(() => undefined);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });
}

function sameApplicationServerKey(subscription: PushSubscription, expected: Uint8Array): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const bytes = current instanceof ArrayBuffer ? new Uint8Array(current) : new Uint8Array(current);
  if (bytes.length !== expected.length) return false;
  return bytes.every((value, index) => value === expected[index]);
}

export async function disablePush(): Promise<void> {
  setAlertsEnabled(false);
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  try {
    await request('/push/unsubscribe', {
      method: 'POST',
      body: { endpoint: subscription.endpoint },
    });
  } finally {
    await subscription.unsubscribe().catch(() => undefined);
  }
}
