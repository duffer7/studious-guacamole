import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

interface NotificationClickMessage {
  type?: string;
  chatId?: number;
}

export function useNotificationClick() {
  const navigate = useNavigate();

  useEffect(() => {
    const openChat = (chatId: unknown) => {
      const id = typeof chatId === 'number' ? chatId : Number(chatId);
      if (!Number.isInteger(id) || id <= 0) return;
      void navigate({ to: '/chats', search: { c: id } });
    };

    const onWindowMessage = (event: MessageEvent<NotificationClickMessage>) => {
      if (event.origin && event.origin !== window.location.origin) return;
      if (event.data?.type !== 'notification-click') return;
      openChat(event.data.chatId);
    };

    const onWorkerMessage = (event: MessageEvent<NotificationClickMessage>) => {
      if (event.data?.type === 'pushsubscriptionchange') return;
      if (event.data?.type !== 'notification-click') return;
      openChat(event.data.chatId);
    };

    window.addEventListener('message', onWindowMessage);
    navigator.serviceWorker?.addEventListener('message', onWorkerMessage);
    return () => {
      window.removeEventListener('message', onWindowMessage);
      navigator.serviceWorker?.removeEventListener('message', onWorkerMessage);
    };
  }, [navigate]);
}
