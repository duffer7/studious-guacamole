/* eslint-disable no-restricted-globals */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }

  if (data.type === 'call-dismiss' && data.tag) {
    event.waitUntil(closeByTag(data.tag));
    return;
  }

  const isCall = data.type === 'call';
  event.waitUntil(
    self.registration.showNotification(data.title || 'Guacamole', {
      body: data.body || '',
      tag: data.tag,
      data,
      renotify: isCall || data.type === 'missed-call',
      requireInteraction: isCall,
      vibrate: isCall ? [500, 300, 500, 300, 500] : undefined,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();
  event.waitUntil(openApp(data));
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        client.postMessage({ type: 'pushsubscriptionchange' });
      }
    }),
  );
});

async function closeByTag(tag) {
  const notifications = await self.registration.getNotifications({ tag });
  for (const notification of notifications) notification.close();
}

async function openApp(data) {
  const url = data.chatId ? `/chats?c=${data.chatId}` : '/chats';
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const existing = windows.find((client) => client.url.includes(self.location.origin));
  if (existing) {
    try {
      await existing.focus();
      existing.postMessage({ type: 'notification-click', ...data });
      return;
    } catch {
      // браузер может запретить focus — откроем новое окно
    }
  }
  await self.clients.openWindow(url);
}
