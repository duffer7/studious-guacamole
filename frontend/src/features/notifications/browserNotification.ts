import type { ChatSummary, Message } from '@features/chats/types';

const PREVIEW_LIMIT = 140;

export function shouldShowBrowserNotification(input: {
  senderId: number;
  currentUserId: number | undefined;
  chatId: number;
  activeChatId: number | null;
  tabVisible: boolean;
}): boolean {
  if (!input.currentUserId || input.senderId === input.currentUserId) return false;
  if (input.tabVisible && input.activeChatId === input.chatId) return false;
  return true;
}

export function previewMessageBody(message: Pick<Message, 'type' | 'body' | 'attachmentName'>): string {
  if (message.type === 'file') {
    const name = message.attachmentName?.trim();
    return name || 'Файл';
  }
  const text = message.body?.trim() ?? '';
  if (!text) return 'Новое сообщение';
  return text.length > PREVIEW_LIMIT ? `${text.slice(0, PREVIEW_LIMIT)}…` : text;
}

export function buildMessageNotification(
  message: Message,
  chats: ChatSummary[] | undefined,
  _currentUserId?: number,
): { title: string; body: string; tag: string; chatId: number } {
  const chat = chats?.find((item) => item.id === message.chatId);
  const sender = chat?.members.find((member) => member.id === message.senderId);
  const from = sender?.displayName?.trim() || sender?.username || 'Сообщение';
  const preview = previewMessageBody(message);
  const isGroup = chat?.type === 'group' || chat?.type === 'channel';
  const chatTitle = chat?.title?.trim();

  return {
    title: isGroup && chatTitle ? chatTitle : from,
    body: isGroup ? `${from}: ${preview}` : preview,
    tag: `chat:${message.chatId}`,
    chatId: message.chatId,
  };
}

export async function showBrowserNotification(options: {
  title: string;
  body: string;
  tag: string;
  chatId?: number;
  callId?: string;
  type?: 'message' | 'call' | 'missed-call';
}): Promise<void> {
  if (!areAlertsEnabled()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const type = options.type ?? 'message';
  const data = {
    type,
    title: options.title,
    body: options.body,
    tag: options.tag,
    chatId: options.chatId,
    callId: options.callId,
  };
  const notificationOptions: NotificationOptions = {
    body: options.body,
    tag: options.tag,
    data,
    renotify: type === 'call' || type === 'missed-call',
    requireInteraction: type === 'call',
  };

  try {
    const registration = await navigator.serviceWorker?.getRegistration('/');
    if (registration?.showNotification) {
      await registration.showNotification(options.title, notificationOptions);
      return;
    }
    new Notification(options.title, notificationOptions);
  } catch {
    // Chrome требует SW.showNotification, если страница под контролем worker'а
  }
}

export async function closeBrowserNotifications(tag: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration('/');
    const list = await registration?.getNotifications({ tag });
    list?.forEach((notification) => notification.close());
  } catch {
    // нет SW — закрывать нечего
  }
}

export function showMessageBrowserNotification(
  message: Message,
  chats: ChatSummary[] | undefined,
  currentUserId: number | undefined,
): Promise<void> {
  const built = buildMessageNotification(message, chats, currentUserId);
  return showBrowserNotification({ ...built, type: 'message' });
}

const ALERTS_KEY = 'notifications.alertsEnabled';

export function areAlertsEnabled(): boolean {
  try {
    return localStorage.getItem(ALERTS_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setAlertsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ALERTS_KEY, enabled ? '1' : '0');
  } catch {
    // private mode
  }
}
