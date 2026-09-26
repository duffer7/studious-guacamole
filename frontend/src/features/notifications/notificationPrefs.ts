const STORAGE_KEY = 'notifications.prefs';

export interface NotificationPrefs {
  messageSound: boolean;
  callSound: boolean;
  volume: number;
}

const defaults: NotificationPrefs = {
  messageSound: true,
  callSound: true,
  volume: 0.8,
};

export function loadNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    const volume = typeof parsed.volume === 'number' ? parsed.volume : defaults.volume;
    return {
      messageSound: parsed.messageSound !== false,
      callSound: parsed.callSound !== false,
      volume: Math.min(1, Math.max(0, volume)),
    };
  } catch {
    return defaults;
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
